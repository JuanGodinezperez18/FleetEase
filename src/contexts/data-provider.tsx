

"use client";

import type { Transaction, WriteBatch, QuerySnapshot, DocumentData } from 'firebase/firestore';
import React, { createContext, useState, useEffect, useCallback, useMemo, ReactNode, useContext } from 'react';
import { useQuery, useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useAuth } from './auth-provider';
import { GlobalLoader } from '@/components/common/GlobalLoader';
import {
  vehicleService,
  clientService,
  partnerService,
  creditService,
  financialRecordService,
  notificationService,
  mileageLogService,
  userService,
  vehicleAssignmentLogService,
  companyService,
  financialCategoryService,
  messageTemplateService,
  messageLogService,
  creditPaymentScheduleService,
  multaService,
  db,
} from '@/lib/firestore-services';
import {
  query,
  where,
  getDocs,
  limit,
  doc,
  runTransaction,
  writeBatch,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  orderBy,
  serverTimestamp,
  or,
} from 'firebase/firestore';
import { deleteObject, ref, getStorage } from 'firebase/storage';
import type {
  Client,
  Vehicle,
  VehicleWithMileage,
  MileageLog,
  FinancialRecord,
  Partner,
  UserProfile,
  Credit,
  Notification,
  VehicleAssignmentLog,
  Company,
  FinancialCategory,
  ClientChangeLog,
  CompanyChangeLog,
  MessageTemplate,
  MessageLog,
  CreditPaymentSchedule,
  Multa,
} from '@/types';
import { sanitizeAndFormatData, formatCurrency } from '@/lib/utils';
import { calculateVehicleMileageInfo } from '@/lib/vehicle-calculations';
import { useVehicleAnalytics } from '@/hooks/use-vehicle-analytics';
import { useClientAnalytics } from '@/hooks/use-client-analytics';
import { toast } from 'sonner';
import { useOfflineSync } from '@/hooks/use-offline-sync';
import { addWeeks } from 'date-fns';
import { logAudit } from '@/lib/audit';

export const CREDIT_GRANTED_CATEGORY = 'Crédito Otorgado';
export const CREDIT_PAYMENT_CATEGORY = 'vKeQhlbdBmZhPw8ZmJEX';
export const CLIENT_PAYMENT_CATEGORY = "Abono de Cliente";
export const DRIVER_PAYMENT_CATEGORY = "Pago a Conductor";
export const MAINTENANCE_CATEGORY = "Mantenimiento";
export const SECURITY_DEPOSIT_CATEGORY = "Depósito de Crédito / Enganche";
export const PARTNER_PAYMENT_CATEGORY_NAME = 'Pago a Socio'
export let PARTNER_PAYMENT_CATEGORY_ID: string | undefined
export const CLIENT_SECURITY_DEPOSIT_CATEGORY_ID = "66NXhL4RKMnc65R5GcKQ";
export const calculatePartnerBalance = (
  partner: Partner,
  partnerVehicles: Vehicle[],
  financialRecords: FinancialRecord[],
  PARTNER_PAYMENT_CATEGORY_ID?: string
): number => {
  const partnerVehicleIds = new Set(partnerVehicles.map(v => v.id));

  // 1️⃣ INGRESOS
  const totalIncome = financialRecords
    .filter(r => 
      r.type === 'income' && 
      r.vehicleId && 
      partnerVehicleIds.has(r.vehicleId) && 
      !r.isDeleted
    )
    .reduce((sum, r) => sum + r.amount, 0);

  // 2️⃣ GASTOS OPERACIONALES
  const totalExpenses = financialRecords
    .filter(r => 
      r.type === 'expense' && 
      r.vehicleId && 
      partnerVehicleIds.has(r.vehicleId) && 
      r.paymentMethod !== 'partnerpays' &&
      !r.isDeleted
    )
    .reduce((sum, r) => sum + r.amount, 0);

  // 3️⃣ TODOS LOS PAGOS AL SOCIO
  const allPartnerPayments = financialRecords
    .filter(r => 
      r.type === 'payment' &&
      r.partnerId === partner.id &&
      !r.isDeleted
    );

  const totalPaymentsAlreadyMade = allPartnerPayments.reduce((sum, r) => sum + r.amount, 0);

  // 📊 LOG DETALLADO CON TODOS LOS PAGOS
  console.log('💰 CÁLCULO DE BALANCE - SOCIO:', partner.name);
  console.log('═══════════════════════════════════');
  console.log('📌 Saldo Inicial:', partner.initialBalance || 0);
  console.log('➕ Total Ingresos (Flota):', totalIncome);
  console.log('➖ Total Gastos (Flota):', totalExpenses);
  console.log('');
  console.log('💸 PAGOS AL SOCIO ENCONTRADOS:');
  console.log('═══════════════════════════════════');
  allPartnerPayments.forEach((payment, index) => {
    console.log(`  ${index + 1}. ${formatCurrency(payment.amount)} - "${payment.description}" (${payment.date})`);
  });
  console.log('');
  console.log('TOTAL PAGOS:', totalPaymentsAlreadyMade);
  console.log('═══════════════════════════════════');
  console.log('📊 CÁLCULO FINAL:');
  const finalBalance = (partner.initialBalance || 0) + totalIncome - totalExpenses - totalPaymentsAlreadyMade;
  console.log(`${formatCurrency(partner.initialBalance || 0)} + ${formatCurrency(totalIncome)} - ${formatCurrency(totalExpenses)} - ${formatCurrency(totalPaymentsAlreadyMade)} = ${formatCurrency(finalBalance)}`);
  console.log('═══════════════════════════════════');

  return finalBalance;
};

// --- Helper Hook fuera del componente ---
const useOptimisticMutation = <TData, TVariables>(
  queryClient: any,
  queryKey: QueryKey,
  mutationFn: (vars: TVariables) => Promise<any>,
  operation: 'add' | 'update' | 'delete' | 'softDelete',
  onSuccess?: (data: any, variables: TVariables) => void,
) => {
  return useMutation<any, Error, TVariables>({
    mutationFn,
    onMutate: async (variables: TVariables) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData(queryKey);
      return { previousData };
    },
    onError: (err: Error, variables: TVariables, context: any) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      toast.error("Error", { description: "La operación falló." });
    },
    onSettled: async (data, error, variables) => {
      await queryClient.invalidateQueries({ queryKey });
      if (!error && onSuccess) {
        onSuccess(data, variables);
      }
    },
  });
};


// Función para asegurar que la categoría "Crédito Otorgado" exista
const ensureSystemCategories = async (currentUser: UserProfile | null) => {
    if (!currentUser) return;

    try {
      const isAdmin = currentUser.role === 'admin' || currentUser.role === 'superAdmin';
      if (!isAdmin) return;

      // Verificar/crear categoría "Crédito Otorgado"
      const qCredit = query(
        collection(db, 'financialCategories'),
        where('companyId', '==', null),
        where('name', '==', CREDIT_GRANTED_CATEGORY),
        where('isDefault', '==', true),
        limit(1)
      );

      const snapshotCredit = await getDocs(qCredit);

      if (snapshotCredit.empty) {
        await addDoc(collection(db, 'financialCategories'), {
          name: CREDIT_GRANTED_CATEGORY,
          type: 'income',
          affects: 'client_balance',
          description: 'Registro del crédito otorgado al cliente',
          isDefault: true,
          companyId: null,
          createdAt: new Date().toISOString(),
        });
        console.log('✅ Categoría de sistema "Crédito Otorgado" creada.');
      }

      // Verificar/crear categoría "Multa"
      const qMulta = query(
        collection(db, 'financialCategories'),
        where('companyId', '==', null),
        where('name', '==', 'Multa'),
        where('isDefault', '==', true),
        limit(1)
      );

      const snapshotMulta = await getDocs(qMulta);

      if (snapshotMulta.empty) {
        await addDoc(collection(db, 'financialCategories'), {
          name: 'Multa',
          type: 'income',
          affects: 'client_balance',
          description: 'Registro automático de multas de tránsito',
          isDefault: true,
          companyId: null,
          createdAt: new Date().toISOString(),
        });
        console.log('✅ Categoría de sistema "Multa" creada.');
      }

      // Verificar/crear categoría "Pago de Multa"
      const qPagoMulta = query(
        collection(db, 'financialCategories'),
        where('companyId', '==', null),
        where('name', '==', 'Pago de Multa'),
        where('isDefault', '==', true),
        limit(1)
      );

      const snapshotPagoMulta = await getDocs(qPagoMulta);

      if (snapshotPagoMulta.empty) {
        await addDoc(collection(db, 'financialCategories'), {
          name: 'Pago de Multa',
          type: 'payment',
          affects: 'client_balance',
          description: 'Pago de multas de tránsito por parte del cliente',
          isDefault: true,
          companyId: null,
          createdAt: new Date().toISOString(),
        });
        console.log('✅ Categoría de sistema "Pago de Multa" creada.');
      }
    } catch (error) {
      console.warn('⚠️ Aviso: No se pudo verificar/crear categorías del sistema:', error);
    }
  };


// Helper to log client changes within a transaction
async function logClientChange(
  transaction: Transaction,	// ← Cambiar WriteBatch a Transaction
  clientId: string,
  changeType: ClientChangeLog['changeType'],
  userId: string,
  userName: string,
  description: string,
  fieldChanged?: string,
  previousValue?: any,
  newValue?: any
): Promise<void> {
  try {
    const clientChangeLogRef = doc(collection(db, 'clientChangeLogs'));
    const logData = {
      clientId,
      changeType,
      changedBy: userId,
      changedByName: userName,
      changedAt: new Date().toISOString(),
      description,
      fieldChanged: fieldChanged || null,
      previousValue: previousValue === undefined ? null : previousValue,
      newValue: newValue === undefined ? null : newValue,
    };
    
    transaction.set(clientChangeLogRef, logData);
  } catch (error) {
    console.error('Error logging client change:', error);
  }
}

// --- Data Context ---
export interface DataContextType {
  vehicles: VehicleWithMileage[];
  rawVehicles: Vehicle[];
  allVehicles: Vehicle[];
  allClients: Client[];
  vehicleMetrics: ReturnType<typeof useVehicleAnalytics>['vehicleMetrics'];
  clients: Client[];
  clientMetrics: ReturnType<typeof useClientAnalytics>['clientMetrics'];
  clientBalances: { id: string; balance: number }[];
  partnerBalances: { id: string; name: string; balance: number; vehicleCount?: number; email?: string }[];
  partners: Partner[];
  credits: Credit[];
  financialRecords: FinancialRecord[];
  notifications: Notification[];
  mileageLogs: MileageLog[];
  users: UserProfile[];
  vehicleAssignmentLogs: VehicleAssignmentLog[];
  companies: Company[];
  rawCompanies: Company[];
  financialCategories: FinancialCategory[];
  messageTemplates: MessageTemplate[];
  messageLogs: MessageLog[];
  creditPaymentSchedules: CreditPaymentSchedule[];
  multas: Multa[];
  loadingData: boolean;
  addVehicle: (data: Omit<Vehicle, 'id'>) => Promise<Vehicle>;
  updateVehicle: (id: string, data: Partial<Vehicle>) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;
  addClient: (data: Partial<Client>) => Promise<Client>;
  updateClient: (id: string, data: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  addPartner: (data: Omit<Partner, 'id' | 'isDeleted' | 'createdAt'>) => Promise<Partner>;
  updatePartner: (id: string, data: Partial<Partner>) => Promise<void>;
  deletePartner: (id: string) => Promise<void>;
  addCompany: (data: Omit<Company, 'id'>) => Promise<Company>;
  updateCompany: (id: string, data: Partial<Company>) => Promise<void>;
  deleteCompany: (id: string) => Promise<void>;
  addFinancialCategory: (data: Omit<FinancialCategory, 'id'>, returnObject?: boolean) => Promise<any>;
  updateFinancialCategory: (id: string, data: Partial<FinancialCategory>) => Promise<void>;
  deleteFinancialCategory: (id: string) => Promise<void>;
  addFinancialRecord: (record: Omit<FinancialRecord, 'id' | 'uid'>) => Promise<FinancialRecord>;
  updateFinancialRecord: (id: string, data: Partial<FinancialRecord>) => Promise<void>;
  deleteFinancialRecord: (id: string, onSuccess?: () => void) => Promise<void>;
  addExpense: (data: Omit<FinancialRecord, 'id' | 'type' | 'uid'>) => Promise<void>;
  updateExpense: (id: string, data: Partial<FinancialRecord>) => Promise<void>;
  addIncome: (data: Partial<Omit<FinancialRecord, 'id'>>) => Promise<void>;
  updateIncome: (id: string, data: Partial<FinancialRecord>) => Promise<void>;
  addPayment: (data: Omit<FinancialRecord, 'id' | 'uid' | 'type' | 'category'>) => Promise<void>;
  updatePayment: (id: string, data: Partial<FinancialRecord>) => Promise<void>;
  addCredit: (data: Omit<Credit, 'id' | 'uid'>) => Promise<Credit>;
  updateCredit: (id: string, data: Partial<Credit>) => Promise<void>;
  deleteCredit: (id: string) => Promise<void>;
  deactivateCredit: (id: string) => Promise<void>;
  addMessageTemplate: (data: Omit<MessageTemplate, 'id'>) => Promise<MessageTemplate>;
  updateMessageTemplate: (id: string, data: Partial<MessageTemplate>) => Promise<void>;
  deleteMessageTemplate: (id: string) => Promise<void>;
  sendInternalMessage: (userIds: string[], title: string, body: string) => Promise<void>;
  handleCreditUpdate: (clientId: string, amount: number, isDownPayment?: boolean) => Promise<boolean>;
  addMileageLog: (log: Omit<MileageLog, 'id' | 'uid' | 'createdAt'>) => Promise<void>;
  updateMileageLog: (id: string, log: Partial<MileageLog>) => Promise<void>;
  deleteMileageLog: (id: string) => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  getVehicleById: (id: string) => VehicleWithMileage | undefined;
  getVehicleWithDetailsById: (id: string) => VehicleWithMileage | undefined;
  refreshData: () => Promise<void>;
  selectedCompanyId: string | null;
  setSelectedCompanyId: (id: string | null) => void;
  createCreditWithFinancialRecord: (
    creditData: Omit<Credit, 'id' | 'isDeleted'>,
    companyId: string,
  ) => Promise<string | null>;
  processCreditPayment: (
    creditId: string,
    clientId: string,
    amount: number,
    paymentMethod?: string,
    description?: string,
    companyId?: string,
    categoryId?: string
  ) => Promise<{
    success: boolean;
    error?: string;
    newCreditBalance: number;
    creditId: string | null;
    paymentScheduleId: string | null;
    creditCompleted?: boolean;
  }>;
  cancelCredit: (creditId: string) => Promise<void>;
  cancelCreditWithAdjustment: (creditId: string, reason?: string) => Promise<void>;
  deleteCreditWithCleanup: (creditId: string) => Promise<void>;
  addMulta: (data: Omit<Multa, 'id'>) => Promise<Multa>;
  updateMulta: (id: string, data: Partial<Multa>) => Promise<void>;
  deleteMulta: (id: string) => Promise<void>;
  processMultaPayment: (multaId: string, paymentData: Omit<FinancialRecord, 'id' | 'uid' | 'type' | 'category'>) => Promise<void>;
}

export const DataContext = createContext<DataContextType | undefined>(undefined);


export function DataProvider({ children }: { children: ReactNode }) {
    const queryClient = useQueryClient();
    const { currentUser, loading: authLoading } = useAuth();
    const [selectedCompanyId, setSelectedCompanyIdState] = useState<string | null>(null);

    const isSuperAdmin = currentUser?.role === 'superAdmin';

    const setSelectedCompanyId = useCallback((companyId: string | null) => {
        setSelectedCompanyIdState(companyId);
        if (typeof window !== 'undefined') {
            if (companyId) localStorage.setItem('selectedCompanyId', companyId);
            else localStorage.removeItem('selectedCompanyId');
        }
    }, []);
    
    useEffect(() => {
      if (!authLoading && currentUser) {
          if (isSuperAdmin) {
              const savedCompanyId = localStorage.getItem('selectedCompanyId');
              setSelectedCompanyIdState(savedCompanyId === 'all' ? null : (savedCompanyId || null));
          } else {
              setSelectedCompanyIdState(currentUser.companyId || null);
          }
          
          ensureSystemCategories(currentUser);
      }
    }, [currentUser, authLoading, isSuperAdmin]);
    
    const companyIdForFiltering = useMemo(() => {
        if (!currentUser) return undefined; // Return undefined if no user
        if (isSuperAdmin) {
            return selectedCompanyId; // Can be null for 'all', or a specific ID
        }
        return currentUser.companyId; // Must be their company ID
    }, [currentUser, isSuperAdmin, selectedCompanyId]);
    
    // ⚡ OPTIMIZACIÓN: Datos CRÍTICOS - staleTime corto (2 min) para datos frescos
    const { data: allClients = [], isLoading: loadingAllClients } = useQuery<Client[]>({
        queryKey: ['clients', companyIdForFiltering],
        queryFn: async () => {
          if (isSuperAdmin && !companyIdForFiltering) {
            const q = query(collection(db, 'clients'), limit(2000)); // LÍMITE: máximo 2000 clientes
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
          }
          if (!companyIdForFiltering) return [];
          const q = query(
            collection(db, 'clients'),
            where('companyId', '==', companyIdForFiltering),
            limit(2000) // LÍMITE: máximo 2000 clientes por compañía
          );
          const snapshot = await getDocs(q);
          console.log('👥 Clientes (todos - activos e inactivos):', snapshot.docs.length);
          return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
        },
        enabled: !!currentUser,
        staleTime: 2 * 60 * 1000, // 2 minutos para datos críticos
    });
      
    // ⚡ OPTIMIZACIÓN: Datos CRÍTICOS - staleTime corto (2 min)
    const { data: allVehicles = [], isLoading: loadingAllVehicles } = useQuery<Vehicle[]>({
        queryKey: ['vehicles', companyIdForFiltering],
        queryFn: async () => {
            if (isSuperAdmin && !companyIdForFiltering) {
                const q = query(collection(db, 'vehicles'), limit(2000)); // LÍMITE: máximo 2000 vehículos
                const snapshot = await getDocs(q);
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
            }
            if (!companyIdForFiltering) return [];
            const q = query(
                collection(db, 'vehicles'),
                where('companyId', '==', companyIdForFiltering),
                limit(2000) // LÍMITE: máximo 2000 vehículos por compañía
            );
            const snapshot = await getDocs(q);
            console.log('🚗 Vehículos (todos - activos y vendidos):', snapshot.docs.length);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
        },
        enabled: !!currentUser,
        staleTime: 2 * 60 * 1000, // 2 minutos para datos críticos
    });
      
    // ⚡ OPTIMIZACIÓN: Datos SECUNDARIOS - staleTime largo (10 min) para mejor caché
    const { data: allPartners = [], isLoading: loadingAllPartners } = useQuery<Partner[]>({
        queryKey: ['partners', companyIdForFiltering],
        queryFn: async () => {
            if (isSuperAdmin && !companyIdForFiltering) {
                const q = query(collection(db, 'partners'), limit(1000)); // LÍMITE: máximo 1000 socios
                const snapshot = await getDocs(q);
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Partner));
            }
            if (!companyIdForFiltering) return [];
            const q = query(
                collection(db, 'partners'),
                where('companyId', '==', companyIdForFiltering),
                limit(1000) // LÍMITE: máximo 1000 socios por compañía
            );
            const snapshot = await getDocs(q);
            console.log('🤝 Socios (todos - activos e inactivos):', snapshot.docs.length);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Partner));
        },
        enabled: !!currentUser,
        staleTime: 10 * 60 * 1000, // 10 minutos para datos secundarios
    });

    // ⚡ OPTIMIZACIÓN: Datos SECUNDARIOS - staleTime largo (10 min)
    const { data: allCredits = [], isLoading: loadingAllCredits } = useQuery<Credit[]>({
        queryKey: ['credits', companyIdForFiltering],
        queryFn: async () => {
            if (isSuperAdmin && !companyIdForFiltering) {
                const q = query(collection(db, 'credits'), limit(1500)); // LÍMITE: máximo 1500 créditos
                const snapshot = await getDocs(q);
                return snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() } as Credit))
                    .filter(credit => credit.isDeleted !== true);
            }
            if (!companyIdForFiltering) return [];
            const q = query(
                collection(db, 'credits'),
                where('companyId', '==', companyIdForFiltering),
                limit(1500) // LÍMITE: máximo 1500 créditos por compañía
            );
            const snapshot = await getDocs(q);
            console.log('💳 Créditos de la empresa:', snapshot.docs.length);
            return snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Credit))
                .filter(credit => credit.isDeleted !== true);
        },
        enabled: !!currentUser,
        staleTime: 10 * 60 * 1000, // 10 minutos para datos secundarios
    });

    // ⚡ OPTIMIZACIÓN: Datos CRÍTICOS - staleTime corto (2 min)
    const { data: allFinancialRecords = [], isLoading: loadingAllFinancialRecords } = useQuery<FinancialRecord[]>({
      queryKey: ['financialRecords', companyIdForFiltering],
      queryFn: async (): Promise<FinancialRecord[]> => {
          if (isSuperAdmin && !companyIdForFiltering) {
              // LÍMITE: Solo los últimos 5000 registros, ordenados por fecha descendente
              const q = query(
                  collection(db, 'financialRecords'),
                  orderBy('date', 'desc'),
                  limit(5000)
              );
              const snapshot = await getDocs(q);
              console.log('📊 Todos los registros financieros (SuperAdmin):', snapshot.docs.length);
              return snapshot.docs
                  .map(doc => ({ id: doc.id, ...doc.data() } as FinancialRecord))
                  .filter(record => record.isDeleted !== true);
          }
          if (!companyIdForFiltering) return [];
          // LÍMITE: Solo los últimos 3000 registros por compañía
          const q = query(
              collection(db, 'financialRecords'),
              where('companyId', '==', companyIdForFiltering as string),
              orderBy('date', 'desc'),
              limit(3000)
          );
          const snapshot = await getDocs(q);
          console.log('📊 Registros financieros de la empresa (ANTES de filtrar):', snapshot.docs.length);

          const filtered = snapshot.docs
              .map(doc => ({ id: doc.id, ...doc.data() } as FinancialRecord))
              .filter(record => record.isDeleted !== true);

          console.log('📊 Registros financieros DESPUÉS de filtrar (isDeleted !== true):', filtered.length);
          return filtered;
      },
      enabled: !!currentUser,
      staleTime: 2 * 60 * 1000, // 2 minutos para datos críticos
  });
    
    // ✅ FIX: Query de `mileageLogs` corregida para usar `companyId` y chunks de 10
    const { data: allMileageLogs = [], isLoading: loadingAllMileageLogs } = useQuery<MileageLog[]>({
        queryKey: ['mileageLogs', companyIdForFiltering],
        queryFn: async () => {
          // ✅ LOG de debugging
          console.log('[MileageLogs] companyIdForFiltering:', companyIdForFiltering, 'role:', currentUser?.role);
          if (!currentUser) return [];
      
          // Si no es SuperAdmin, DEBE tener un companyId
          const effectiveCompanyId = isSuperAdmin ? companyIdForFiltering : currentUser.companyId;
      
          if (!isSuperAdmin && !effectiveCompanyId) {
            console.warn('[MileageLogs] Usuario no SuperAdmin sin companyId, no se pueden cargar logs.');
            return [];
          }
      
          let q;
          if (effectiveCompanyId) {
            // Caso Admin o SuperAdmin con compañía seleccionada
            q = query(
              collection(db, "mileageLogs"),
              where('companyId', '==', effectiveCompanyId),
              orderBy('date', 'desc'),
              limit(5000) // Límite para evitar cargas masivas
            );
          } else {
            // Caso SuperAdmin con "Todas las empresas"
            q = query(
              collection(db, "mileageLogs"),
              orderBy('date', 'desc'),
              limit(5000) // Límite para evitar cargas masivas
            );
          }
          
          const snapshot = await getDocs(q);
          // ✅ LOG de debugging
          console.log('[MileageLogs] snapshot size:', snapshot.docs.length);

          const logs = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as MileageLog))
            // ✅ FIX: Filtrar en cliente los docs que no tienen `isDeleted` o es `false`
            .filter(log => log.isDeleted !== true);
      
          console.log(`[DataProvider] Datos de kilometraje cargados: ${logs.length} registros.`);
          return logs;
        },
        // ✅ FIX: `enabled` no debe depender de allVehicles
        enabled: !!currentUser && companyIdForFiltering !== undefined,
        staleTime: 15 * 60 * 1000,
    });
    
    const { data: allVehicleAssignmentLogs = [], isLoading: loadingAllAssignmentLogs } = useQuery<VehicleAssignmentLog[]>({
      queryKey: ['vehicleAssignmentLogs', companyIdForFiltering],
      queryFn: async () => {
        if (isSuperAdmin && !companyIdForFiltering) {
            const q = query(collection(db, 'vehicleAssignmentLogs'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VehicleAssignmentLog));
        }
        if (!companyIdForFiltering) return [];
        const q = query(collection(db, 'vehicleAssignmentLogs'), where('companyId', '==', companyIdForFiltering));
        const snapshot = await getDocs(q);
        console.log('🔄 Historial de asignaciones:', snapshot.docs.length);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VehicleAssignmentLog));
      },
      enabled: !!currentUser,
      staleTime: 5 * 60 * 1000,
    });

    const { data: allMessageTemplates = [], isLoading: loadingAllMessageTemplates } = useQuery<MessageTemplate[]>({
      queryKey: ['messageTemplates', companyIdForFiltering],
      queryFn: async (): Promise<MessageTemplate[]> => {
          if (isSuperAdmin && !companyIdForFiltering) {
              const q = query(collection(db, 'messageTemplates'));
              const snapshot = await getDocs(q);
              return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MessageTemplate)).filter((t: MessageTemplate) => !t.isDeleted);
          }
          if (!companyIdForFiltering) return [];
          const q = query(collection(db, 'messageTemplates'), where('companyId', '==', companyIdForFiltering as string), where('isDeleted', '!=', true));
          const snapshot = await getDocs(q);
          console.log('💬 Plantillas de mensajes activas:', snapshot.docs.length);
          return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MessageTemplate));
      },
      enabled: !!currentUser,
      staleTime: 5 * 60 * 1000,
  });

    const { data: allMessageLogs = [], isLoading: loadingAllMessageLogs } = useQuery<MessageLog[]>({
      queryKey: ['messageLogs', companyIdForFiltering],
      queryFn: async (): Promise<MessageLog[]> => {
          if (isSuperAdmin && !companyIdForFiltering) {
              const q = query(collection(db, 'messageLogs'));
              const snapshot = await getDocs(q);
              return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MessageLog));
          }
          if (!companyIdForFiltering) return [];
          const q = query(collection(db, 'messageLogs'), where('companyId', '==', companyIdForFiltering as string));
          const snapshot = await getDocs(q);
          console.log('📨 Historial de mensajes:', snapshot.docs.length);
          return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MessageLog));
      },
      enabled: !!currentUser,
      staleTime: 5 * 60 * 1000,
  });
    
  const { data: allCreditPaymentSchedules = [], isLoading: loadingAllCreditSchedules } = useQuery<CreditPaymentSchedule[]>({
    queryKey: ['creditPaymentSchedules', companyIdForFiltering],
    queryFn: async (): Promise<CreditPaymentSchedule[]> => {
        if (isSuperAdmin && !companyIdForFiltering) {
            const q = query(collection(db, 'creditPaymentSchedules'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CreditPaymentSchedule));
        }
        if (!companyIdForFiltering) return [];
        const q = query(collection(db, 'creditPaymentSchedules'), where('companyId', '==', companyIdForFiltering as string));
        const snapshot = await getDocs(q);
        console.log('📅 Cronogramas de pago:', snapshot.docs.length);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CreditPaymentSchedule));
    },
    enabled: !!currentUser,
    staleTime: 5 * 60 * 1000,
});

const { data: allMultas = [], isLoading: loadingAllMultas } = useQuery<Multa[]>({
    queryKey: ['multas', companyIdForFiltering],
    queryFn: async (): Promise<Multa[]> => {
        if (isSuperAdmin && !companyIdForFiltering) {
            const q = query(collection(db, 'multas'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Multa));
        }
        if (!companyIdForFiltering) return [];
        const q = query(collection(db, 'multas'), where('companyId', '==', companyIdForFiltering as string));
        const snapshot = await getDocs(q);
        console.log('🚨 Multas:', snapshot.docs.length);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Multa));
    },
    enabled: !!currentUser,
    staleTime: 5 * 60 * 1000,
});

const { data: allNotifications = [], isLoading: loadingAllNotifications } = useQuery<Notification[]>({
  queryKey: ['notifications', companyIdForFiltering],
  queryFn: async (): Promise<Notification[]> => {
      if (!currentUser) return [];
      const collRef = collection(db, 'notifications');
      let q;
      if (isSuperAdmin && !companyIdForFiltering) {
          q = query(collRef);
      } else if (companyIdForFiltering) {
          q = query(collRef, where('companyId', '==', companyIdForFiltering as string));
      } else {
          return [];
      }
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
          const data = doc.data() as any;
          return { id: doc.id, ...data } as Notification;
      });
  },
  enabled: !!currentUser,
});

const { data: allCompanies = [], isLoading: loadingCompanies } = useQuery({
  queryKey: ['companies'],
  queryFn: async (): Promise<Company[]> => {
    const result = await companyService.getAll();
    return Array.isArray(result) ? result : [];
  },
  enabled: !!currentUser
});

const { data: allUsers = [], isLoading: loadingUsers } = useQuery({
  queryKey: ['users'],
  queryFn: async (): Promise<UserProfile[]> => {
    const result = await userService.getAll();
    return Array.isArray(result) ? result : [];
  },
  enabled: !!currentUser
});
    
    const { data: allFinancialCategories = [], isLoading: loadingCategories } = useQuery<FinancialCategory[]>({
        queryKey: ['financialCategories', companyIdForFiltering],
        queryFn: async () => {
          if (!currentUser) return [];

          try {
            const snapshots: QuerySnapshot<DocumentData, DocumentData>[] = [];

            // Query 1: SIEMPRE obtener categorías del sistema (companyId=null)
            const systemCategoriesSnapshot = await getDocs(
              query(collection(db, 'financialCategories'), where('companyId', '==', null))
            );
            snapshots.push(systemCategoriesSnapshot);

            // Query 2: Categorías específicas de la empresa
            if(isSuperAdmin && !companyIdForFiltering){
              const allCompanyCategoriesSnapshot = await getDocs(
                query(collection(db, 'financialCategories'), where('companyId', '!=', null))
              );
              snapshots.push(allCompanyCategoriesSnapshot);
            } else if (companyIdForFiltering) {
              const companyCategoriesSnapshot = await getDocs(
                query(collection(db, 'financialCategories'), where('companyId', '==', companyIdForFiltering))
              );
              snapshots.push(companyCategoriesSnapshot);
            }

            // Combinar resultados
            const categories = snapshots.flatMap(snapshot =>
                snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FinancialCategory))
            );

            // Eliminar duplicados por ID
            const categoryMap = new Map<string, FinancialCategory>();
            categories.forEach(cat => {
                if (!categoryMap.has(cat.id)) {
                    categoryMap.set(cat.id, cat);
                }
            });

            return Array.from(categoryMap.values());
          } catch (error) {
            console.error('Error al cargar categorías financieras:', error);
            return [];
          }
        },
        enabled: !!currentUser
    });

    const rawVehicles = allVehicles;
    const rawClients = allClients;
    const rawPartners = allPartners;
    const rawCredits = allCredits;
    // Mapear registros financieros para asegurar que tengan el nombre de la categoría
    const rawFinancialRecords = useMemo(() => {
        return allFinancialRecords.map(record => {
            // Si ya tiene el nombre de la categoría, mantenerlo
            if (record.category && record.category !== record.categoryId) {
                return record;
            }
            // Buscar el nombre de la categoría por su ID
            const category = allFinancialCategories.find(c => c.id === record.categoryId);
            return {
                ...record,
                category: category?.name || record.category || 'Sin categoría'
            };
        });
    }, [allFinancialRecords, allFinancialCategories]);

    const rawMileageLogs = allMileageLogs;
    const rawVehicleAssignmentLogs = allVehicleAssignmentLogs;
    const rawNotifications = allNotifications;
    const rawMessageTemplates = allMessageTemplates;
    const rawMessageLogs = allMessageLogs;
    const rawCreditPaymentSchedules = allCreditPaymentSchedules;
    const rawMultas = allMultas;

    const rawCompanies = isSuperAdmin ? allCompanies : allCompanies.filter(c => c.id === currentUser?.companyId);
    const rawUsers = isSuperAdmin ? allUsers : allUsers.filter(u => u.companyId === currentUser?.companyId || u.role === 'superAdmin');


    useEffect(() => {
        const partnerPaymentCategory = allFinancialCategories.find(cat => 
            cat.name === PARTNER_PAYMENT_CATEGORY_NAME && cat.type === 'payment'
        );
        if (partnerPaymentCategory) {
            PARTNER_PAYMENT_CATEGORY_ID = partnerPaymentCategory.id;
        }
    }, [allFinancialCategories]);
    
    // ⚡ OPTIMIZACIÓN: Solo consideramos como "cargando" los datos CRÍTICOS para el dashboard
    // Los datos secundarios pueden cargarse después sin bloquear la UI
    const loadingData = useMemo(() => {
      // ✅ Carga progresiva: Solo esperar datos críticos
      const criticalLoading = authLoading || loadingAllClients || loadingAllVehicles || loadingAllFinancialRecords || loadingCategories;
      
      console.log('📦 [DataProvider] Carga CRÍTICA:', {
        auth: authLoading,
        clients: loadingAllClients,
        vehicles: loadingAllVehicles,
        records: loadingAllFinancialRecords,
        categories: loadingCategories,
      });

      return criticalLoading;
    }, [
      authLoading, loadingAllVehicles, loadingAllClients, loadingAllFinancialRecords,
      loadingCategories
    ]);

    const refreshData = useCallback(async () => {
        await queryClient.invalidateQueries();
    }, [queryClient]);

    const addFinancialRecordAndUpdateBalances = useCallback(async (record: Omit<FinancialRecord, 'id' | 'uid'>): Promise<FinancialRecord> => {
        const category = allFinancialCategories.find(c => c.id === record.categoryId);

        return runTransaction(db, async (transaction) => {
            if (record.clientId && category?.affects === 'client_balance') {
                const clientRef = doc(db, 'clients', record.clientId);
                const clientSnap = await transaction.get(clientRef);
                if (clientSnap.exists()) {
                    // Solo actualizar el timestamp, el balance se calcula desde financialRecords
                    transaction.update(clientRef, { updatedAt: new Date().toISOString() });
                }
            }

            if (record.vehicleId && category?.affects === 'partner_balance') {
                const vehicle = rawVehicles.find(v => v.id === record.vehicleId);
                if (vehicle?.partnerId) {
                    const partnerRef = doc(db, 'partners', vehicle.partnerId);
                    const partnerSnap = await transaction.get(partnerRef);
                    if (partnerSnap.exists()) {
                        const partnerData = partnerSnap.data() as Partner;
                        const amount = record.amount || 0;
                        const newBalance = record.type === 'income' ? (partnerData.balance || 0) + amount : (partnerData.balance || 0) - amount;
                        transaction.update(partnerRef, { balance: newBalance, updatedAt: new Date().toISOString() });
                    }
                }
            }

            // Asegurar que el campo category contenga el nombre de la categoría
            const recordWithCategory = {
                ...record,
                category: category?.name || record.category || 'Sin categoría',
                createdAt: new Date().toISOString()
            };

            const newRecordRef = doc(collection(db, 'financialRecords'));
            transaction.set(newRecordRef, recordWithCategory);

            return { id: newRecordRef.id, ...recordWithCategory } as FinancialRecord;
        });
    }, [allFinancialCategories, rawVehicles]);

    const addVehicleMutation = useOptimisticMutation<Vehicle, Omit<Vehicle, 'id'>>(queryClient, ['vehicles'], (data) => vehicleService.add(data), 'add');
    const updateVehicleMutation = useOptimisticMutation<void, Partial<Vehicle> & {id: string}>(queryClient, ['vehicles'], (data) => vehicleService.update(data.id, data), 'update');
    const deleteVehicleMutation = useOptimisticMutation<void, {id: string}>(queryClient, ['vehicles'], (data) => vehicleService.softDelete(data.id), 'softDelete');
    const addClientMutation = useOptimisticMutation<Client, Partial<Client>>(queryClient, ['clients'], (data) => clientService.add(data as any), 'add');
    const updateClientMutation = useOptimisticMutation<void, Partial<Client> & {id: string}>(queryClient, ['clients'], (data) => clientService.update(data.id, data), 'update');
    const deleteClientMutation = useOptimisticMutation<void, {id: string}>(queryClient, ['clients'], (data) => clientService.softDelete(data.id), 'delete');

    // Función personalizada para agregar cliente con asignación de vehículo
    const addClientWithVehicle = useCallback(async (data: Partial<Client>): Promise<Client> => {
      const newClient = await addClientMutation.mutateAsync(data);

      // Si se asignó un vehículo, crear el registro de asignación y actualizar el vehículo
      if (data.assignedVehicleId && data.companyId) {
        await runTransaction(db, async (transaction) => {
          // Crear registro de asignación
          const assignmentRef = doc(collection(db, 'vehicleAssignmentLogs'));
          const assignmentData = {
            vehicleId: data.assignedVehicleId!,
            clientId: newClient.id,
            companyId: data.companyId,
            assignedAt: new Date().toISOString(),
            startDate: new Date().toISOString(),
            assignedBy: currentUser?.uid || 'system',
            createdAt: new Date().toISOString(),
          };
          transaction.set(assignmentRef, assignmentData);

          // Actualizar vehículo con clientId
          const vehicleRef = doc(db, 'vehicles', data.assignedVehicleId!);
          transaction.update(vehicleRef, {
            clientId: newClient.id,
            status: 'rented',
            updatedAt: new Date().toISOString(),
          });
        });

        // Invalidar queries
        await queryClient.invalidateQueries({ queryKey: ['vehicleAssignmentLogs'] });
        await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      }

      return newClient;
    }, [addClientMutation, currentUser, queryClient]);

    // Función personalizada para actualizar cliente con cambios de vehículo
    const updateClientWithVehicle = useCallback(async (id: string, data: Partial<Client>): Promise<void> => {
      const previousClient = rawClients.find(c => c.id === id);
      const previousVehicleId = previousClient?.assignedVehicleId;
      const newVehicleId = data.assignedVehicleId;

      // Actualizar cliente
      await updateClientMutation.mutateAsync({ ...data, id });

      // Verificar si cambió la asignación de vehículo
      if (previousVehicleId !== newVehicleId) {
        const now = new Date().toISOString();

        // Si tenía vehículo asignado anteriormente, cerrar ese registro FUERA de la transacción
        if (previousVehicleId) {
          // Buscar el registro activo (sin endDate)
          const logsQuery = query(
            collection(db, 'vehicleAssignmentLogs'),
            where('vehicleId', '==', previousVehicleId),
            where('clientId', '==', id)
          );
          const logsSnapshot = await getDocs(logsQuery);

          // Actualizar los registros activos
          const batch = writeBatch(db);
          logsSnapshot.docs.forEach(logDoc => {
            const logData = logDoc.data();
            if (!logData.endDate && !logData.unassignedAt) {
              const logRef = doc(db, 'vehicleAssignmentLogs', logDoc.id);
              batch.update(logRef, {
                endDate: now,
                unassignedAt: now,
              });
            }
          });

          // Actualizar vehículo anterior (remover clientId)
          const prevVehicleRef = doc(db, 'vehicles', previousVehicleId);
          batch.update(prevVehicleRef, {
            clientId: null,
            status: 'active',
            updatedAt: now,
          });

          await batch.commit();
        }

        // Si se asigna un nuevo vehículo, crear registro de asignación
        if (newVehicleId && data.companyId) {
          const batch = writeBatch(db);

          const assignmentRef = doc(collection(db, 'vehicleAssignmentLogs'));
          const assignmentData = {
            vehicleId: newVehicleId,
            clientId: id,
            companyId: data.companyId,
            assignedAt: now,
            startDate: now,
            assignedBy: currentUser?.uid || 'system',
            createdAt: now,
          };
          batch.set(assignmentRef, assignmentData);

          // Actualizar nuevo vehículo (agregar clientId)
          const newVehicleRef = doc(db, 'vehicles', newVehicleId);
          batch.update(newVehicleRef, {
            clientId: id,
            status: 'rented',
            updatedAt: now,
          });

          await batch.commit();
        }

        // Invalidar queries
        await queryClient.invalidateQueries({ queryKey: ['vehicleAssignmentLogs'] });
        await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      }
    }, [updateClientMutation, currentUser, rawClients, queryClient]);
    const addPartnerMutation = useOptimisticMutation<Partner, Omit<Partner, 'id' | 'isDeleted' | 'createdAt'>>(queryClient, ['partners'], (data) => partnerService.add(data as any), 'add');
    const updatePartnerMutation = useOptimisticMutation<void, Partial<Partner> & {id: string}>(queryClient, ['partners'], (data) => partnerService.update(data.id, data), 'update');
    const deletePartnerMutation = useOptimisticMutation<void, {id: string}>(queryClient, ['partners'], (data) => partnerService.softDelete(data.id), 'delete');
    const addCompanyMutation = useOptimisticMutation<Company, Omit<Company, 'id'>>(queryClient, ['companies'], (data) => companyService.add(data as any), 'add');
    const updateCompanyMutation = useOptimisticMutation<void, Partial<Company> & {id: string}>(queryClient, ['companies'], (data) => companyService.update(data.id, data), 'update');
    const addFinancialCategoryMutation = useOptimisticMutation<FinancialCategory, Omit<FinancialCategory, 'id'>>(queryClient, ['financialCategories'], (data) => financialCategoryService.add(data as any), 'add');
    const updateFinancialCategoryMutation = useOptimisticMutation<void, Partial<FinancialCategory> & {id: string}>(queryClient, ['financialCategories'], (data) => financialCategoryService.update(data.id, data), 'update');
    const deleteFinancialCategoryMutation = useOptimisticMutation<void, {id: string}>(queryClient, ['financialCategories'], (data) => financialCategoryService.hardDelete(data.id), 'delete');
    const addFinancialRecordMutation = useOptimisticMutation<FinancialRecord, Omit<FinancialRecord, 'id' | 'uid'>>(queryClient, ['financialRecords'], addFinancialRecordAndUpdateBalances, 'add');
    const updateFinancialRecordMutation = useOptimisticMutation<void, Partial<FinancialRecord> & {id: string}>(queryClient, ['financialRecords'], (data) => financialRecordService.update(data.id, data), 'update');
    const addCreditMutation = useOptimisticMutation<Credit, Omit<Credit, 'id' | 'uid'>>(queryClient, ['credits'], (data) => creditService.add(data as any), 'add');
    const updateCreditMutation = useOptimisticMutation<void, Partial<Credit> & {id: string}>(queryClient, ['credits'], (data) => creditService.update(data.id, data), 'update');
    const deleteCreditMutation = useOptimisticMutation<void, {id: string}>(queryClient, ['credits'], (data) => creditService.softDelete(data.id), 'delete');
    const updateMileageLogMutation = useOptimisticMutation<void, Partial<MileageLog> & {id: string}>(queryClient, ['mileageLogs'], (data) => mileageLogService.update(data.id, data), 'update');
    const deleteMileageLogMutation = useOptimisticMutation<void, {id: string}>(queryClient, ['mileageLogs'], (data) => mileageLogService.hardDelete(data.id), 'delete');
    const addMessageTemplateMutation = useOptimisticMutation<MessageTemplate, Omit<MessageTemplate, 'id'>>(queryClient, ['messageTemplates'], (data) => messageTemplateService.add(data as any), 'add');
    const updateMessageTemplateMutation = useOptimisticMutation<void, Partial<MessageTemplate> & {id: string}>(queryClient, ['messageTemplates'], (data) => messageTemplateService.update(data.id, data), 'update');
    const deleteMessageTemplateMutation = useOptimisticMutation<void, {id: string}>(queryClient, ['messageTemplates'], (data) => messageTemplateService.hardDelete(data.id), 'delete');

    const addMileageLog = useCallback(async (log: Omit<MileageLog, 'id' | 'uid' | 'createdAt'>) => {
        await runTransaction(db, async (transaction) => {
            const vehicleRef = doc(db, 'vehicles', log.vehicleId);
            const vehicleDoc = await transaction.get(vehicleRef);

            if (!vehicleDoc.exists()) {
                throw new Error("El vehículo especificado no existe.");
            }

            const vehicleData = vehicleDoc.data() as Vehicle;
            if (log.mileage < (vehicleData.currentMileage || 0)) {
                throw new Error("El nuevo kilometraje no puede ser menor al actual.");
            }

            const newLogRef = doc(collection(db, 'mileageLogs'));
            const logData: Omit<MileageLog, 'id'> = { 
                ...log, 
                companyId: vehicleData.companyId, 
                createdAt: new Date().toISOString(), 
                createdBy: currentUser?.uid || 'system',
                isDeleted: false,
                source: 'manual', 
                kind: 'odometer',
            };
            transaction.set(newLogRef, logData);

            transaction.update(vehicleRef, { currentMileage: log.mileage });
        });

        // Invalidar queries para refrescar datos
        await queryClient.invalidateQueries({ queryKey: ['mileageLogs'] });
        await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    }, [currentUser?.uid, queryClient]);
    
    // ✅ SOLUCIÓN: Lógica de `addExpense` corregida para manejar la transacción de forma segura
    const addExpense = useCallback(async (data: Omit<FinancialRecord, 'id' | 'type' | 'uid'>) => {
      const maintenanceCategory = allFinancialCategories.find(c => c.name === MAINTENANCE_CATEGORY);
      const isMaintenance = data.categoryId === maintenanceCategory?.id;
      const now = new Date().toISOString();
    
      await runTransaction(db, async (transaction) => {
        let vehicleRef: any;
        let vehicleDoc: any;
        let companyId = data.companyId;
    
        // 1. Validar y obtener vehículo
        if (data.vehicleId) {
          vehicleRef = doc(db, 'vehicles', data.vehicleId);
          vehicleDoc = await transaction.get(vehicleRef);
          if (!vehicleDoc.exists()) {
            throw new Error("El vehículo especificado para el gasto no existe.");
          }
          if (!companyId) {
            companyId = vehicleDoc.data()?.companyId;
          }
        }
    
        // 2. Crear el registro de gasto
        const newExpenseRef = doc(collection(db, 'financialRecords'));
        const expenseData = {
          ...data,
          type: 'expense' as const,
          createdBy: currentUser?.uid || 'system',
          createdAt: now,
          isDeleted: false,
          companyId: companyId || null,
        };
        transaction.set(newExpenseRef, expenseData);
    
        // 3. Si hay kilometraje, crear logs y actualizar vehículo
        if (data.mileageAtExpense && data.vehicleId) {
          // Log de odómetro (siempre)
          const odometerLogRef = doc(collection(db, "mileageLogs"));
          const odometerLogData: Omit<MileageLog, "id"> = {
            vehicleId: data.vehicleId,
            mileage: data.mileageAtExpense,
            date: data.date,
            source: "expense",
            kind: "odometer",
            financialRecordId: newExpenseRef.id,
            notes: `Gasto: ${data.description}`,
            createdAt: now,
            companyId: companyId ?? null,
            isDeleted: false,
          };
          transaction.set(odometerLogRef, odometerLogData);

          const updatePayload: Partial<Vehicle> = { currentMileage: data.mileageAtExpense };
    
          // Log de mantenimiento (solo si es la categoría correcta)
          if (isMaintenance) {
            const maintLogRef = doc(collection(db, "mileageLogs"));
            const maintLogData: Omit<MileageLog, "id"> = {
              ...odometerLogData,
              kind: 'maintenance',
              notes: `Mantenimiento: ${data.description}`,
            };
            transaction.set(maintLogRef, maintLogData);
            updatePayload.lastMaintenanceMileage = data.mileageAtExpense;
          }
    
          if (vehicleRef) {
            transaction.update(vehicleRef, updatePayload);
          }
        }
      });
    
      // 4. Invalidar queries para refrescar datos
      await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      await queryClient.invalidateQueries({ queryKey: ['financialRecords'] });
      await queryClient.invalidateQueries({ queryKey: ['mileageLogs'] });
    }, [currentUser?.uid, allFinancialCategories, queryClient]);

    const deleteFinancialRecord = useCallback(async (id: string, onSuccess?: () => void) => {
        try {
          await runTransaction(db, async (transaction) => {
              const recordRef = doc(db, "financialRecords", id);
              const recordSnap = await transaction.get(recordRef);
              if (!recordSnap.exists()) {
                throw new Error("El registro financiero no existe.");
              }
              const recordData = recordSnap.data() as FinancialRecord;
    
              // 1. Marcar el gasto como eliminado
              transaction.update(recordRef, {
                  isDeleted: true,
                  deletedAt: new Date().toISOString(),
              });
    
              // 2. Eliminar logs de kilometraje asociados
              const logsQuery = query(collection(db, "mileageLogs"), where("financialRecordId", "==", id));
              const logsSnapshot = await getDocs(logsQuery);
              if (!logsSnapshot.empty) {
                  logsSnapshot.docs.forEach((d) => transaction.delete(d.ref));
              }
    
              // 3. Recalcular estado del vehículo desde los logs restantes
              if (recordData.vehicleId) {
                const vehicleRef = doc(db, "vehicles", recordData.vehicleId);
                
                // Re-leer todos los logs restantes para encontrar los más nuevos
                const allLogsQuery = query(
                    collection(db, "mileageLogs"),
                    where("vehicleId", "==", recordData.vehicleId),
                    orderBy("date", "desc")
                );
                const allLogsSnapshot = await getDocs(allLogsQuery);
    
                const remainingLogs = allLogsSnapshot.docs
                  .map(d => d.data() as MileageLog)
                  .filter(l => l.financialRecordId !== id && !l.isDeleted);
    
                const lastOdometerLog = remainingLogs.find(l => l.kind === 'odometer' || !l.kind); // Compatibilidad con logs antiguos
                const lastMaintenanceLog = remainingLogs.find(l => l.kind === 'maintenance');
    
                transaction.update(vehicleRef, {
                    currentMileage: lastOdometerLog?.mileage || 0,
                    lastMaintenanceMileage: lastMaintenanceLog?.mileage || 0,
                });
              }
          });
    
          // 4. Invalidar cachés
          await queryClient.invalidateQueries({ queryKey: ['financialRecords'] });
          await queryClient.invalidateQueries({ queryKey: ['mileageLogs'] });
          await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    
          if (onSuccess) onSuccess();
    
        } catch (error) {
          console.error("Error al eliminar registro:", error);
          throw error;
        }
      }, [queryClient]);
    
    const processCreditPayment = useCallback(
      async (
        creditId: string,
        clientId: string,
        amount: number,
        paymentMethod?: string,
        description?: string,
        companyId?: string,
        categoryId?: string
      ): Promise<{ success: boolean; error?: string; newCreditBalance: number; creditId: string | null; paymentScheduleId: string | null; creditCompleted?: boolean; }> => {
        try {
          let result: { newCreditBalance: number; paymentScheduleId: string | null; creditCompleted: boolean; } = { newCreditBalance: 0, paymentScheduleId: null, creditCompleted: false };
          
          await runTransaction(db, async (transaction) => {
            // PASO 1: Obtener el crédito
            console.log('📄 PASO 1: Obteniendo crédito', creditId);
            const creditRef = doc(db, 'credits', creditId);
            const creditSnap = await transaction.get(creditRef);
            
            if (!creditSnap.exists()) {
              console.error('❌ ERROR: Crédito no existe en la base de datos');
              throw new Error('Crédito no encontrado');
            }
            
            const creditData = creditSnap.data() as Credit;
            
            // PASO 2: Validar estado del crédito
            console.log('🚦 PASO 2: Validando estado del crédito. Estado actual:', creditData.status);
            if (creditData.status !== 'active') {
              console.error('❌ ERROR: Crédito no está activo. Estado:', creditData.status);
              throw new Error('Crédito no está activo. Estado actual: ' + creditData.status);
            }
    
            // PASO 3: Obtener el cliente
            console.log('👤 PASO 3: Obteniendo cliente', clientId);
            const clientRef = doc(db, 'clients', clientId);
            const clientSnap = await transaction.get(clientRef);
            
            if (!clientSnap.exists()) {
              console.error('❌ ERROR: Cliente no existe en la base de datos');
              throw new Error('Cliente no encontrado');
            }
            const clientData = clientSnap.data() as Client;
    
            // PASO 4: Calcular nuevos valores del crédito
            console.log('📊 PASO 4: Calculando nuevos valores del crédito');
            const newPaidAmount = creditData.paidAmount + amount;
            const newRemainingBalance = Math.max(0, creditData.remainingBalance - amount);
            const paymentsMade = (creditData.paymentsMade || 0) + 1;
            const isCompleted = newRemainingBalance <= 0;
    
            console.log('📈 Nuevos valores calculados:', {
              newPaidAmount,
              newRemainingBalance,
              paymentsMade,
              isCompleted,
              newStatus: isCompleted ? 'completed' : 'active',
            });
            
            // PASO 5: Actualizar el crédito
            console.log('💾 PASO 5: Actualizando documento de crédito');
            const updatePayload: Partial<Credit> = {
              paidAmount: newPaidAmount,
              remainingBalance: newRemainingBalance,
              paymentsMade,
              status: isCompleted ? 'completed' : 'active',
              lastPaymentDate: new Date().toISOString(),
              lastPaymentAmount: amount,
              updatedAt: new Date().toISOString()
            };
    
            transaction.update(creditRef, updatePayload);
            console.log('✅ Crédito actualizado en transacción');
    
            // PASO 6: Si el crédito se completó, actualizar cliente
            if (isCompleted) {
                console.log('🎉 PASO 6: Crédito completado. Actualizando cliente');
                transaction.update(clientRef, {
                  hasActiveCredit: false,
                  activeCreditId: null,
                  updatedAt: new Date().toISOString()
                });
                console.log('✅ Cliente actualizado: hasActiveCredit=false');
            } else {
                console.log('ℹ️ PASO 6: Crédito aún activo, cliente mantiene hasActiveCredit=true');
            }
    
            // PASO 7: Actualizar balance del cliente (CRÍTICO - AQUÍ ESTABA EL ERROR)
            console.log('💰 PASO 7: Actualizando balance del cliente');
            const currentBalance = clientData.balance || 0;
            const newClientBalance = currentBalance - amount;
    
            console.log('💵 Balance del cliente:', {
              currentBalance,
              paymentAmount: amount,
              newClientBalance,
            });
    
            transaction.update(clientRef, {
              updatedAt: new Date().toISOString()
            });
            console.log('✅ Balance del cliente actualizado');
            
            // PASO 8: Crear registro financiero del pago
            console.log('📄 PASO 8: Creando registro financiero del pago');
            const finalCategoryId = categoryId || CREDIT_PAYMENT_CATEGORY;
    
            if (!finalCategoryId) {
              console.error('❌ ERROR: No se especificó categoría de pago de crédito');
              throw new Error('No se especificó categoría de pago de crédito');
            }
    
            const newRecordRef = doc(collection(db, 'financialRecords'));
            const recordPayload = {
              companyId,
              clientId,
              vehicleId: creditData.vehicleId,
              categoryId: finalCategoryId,
              type: 'payment',
              amount,
              paymentMethod: paymentMethod || 'transferencia',
              description: description || `Pago de crédito - Cuota ${paymentsMade} de ${creditData.numberOfPayments}`,
              date: new Date().toISOString(),
              creditId: creditId,
              creditPayment: true,
              isDeleted: false,
              createdBy: currentUser?.uid || 'system',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
    
            transaction.set(newRecordRef, recordPayload);
            console.log('✅ Registro financiero creado:', {
              recordId: newRecordRef.id,
              amount,
              creditPayment: true,
            });
    
            const schedules = rawCreditPaymentSchedules.filter(s => s.creditId === creditId && s.status === 'pending');
            if (schedules.length > 0) {
              const nextSchedule = schedules.sort((a,b) => a.paymentNumber - b.paymentNumber)[0];
              const scheduleRef = doc(db, 'creditPaymentSchedules', nextSchedule.id);
              transaction.update(scheduleRef, { status: 'paid', paidAmount: amount, paidDate: new Date().toISOString() });
              result.paymentScheduleId = nextSchedule.id;
            }
            
            result.newCreditBalance = newRemainingBalance;
            result.creditCompleted = isCompleted;
          });
    
          console.log('✅ [TRANSACCIÓN COMPLETADA EXITOSAMENTE]');
          console.log('🎯 Resultado final:', {
            success: true,
            newCreditBalance: result.newCreditBalance,
            creditCompleted: result.creditCompleted,
            paymentScheduleId: result.paymentScheduleId,
          });
    
          return { success: true, ...result, creditId: creditId };
        } catch (error: any) {
          console.error('❌ [ERROR EN PROCESSCREDITPAYMENT]');
          console.error('Error tipo:', error.code || 'UNKNOWN');
          console.error('Mensaje:', error.message);
          console.error('Stack:', error.stack);
          console.error('Objeto completo:', error);
        
          return {
            success: false,
            error: error.message || 'Error desconocido al procesar el pago',
            newCreditBalance: 0,
            creditId: null,
            paymentScheduleId: null
          };
        }
      },
      [rawCreditPaymentSchedules, currentUser]
    );

    const addIncome = useCallback(async (data: Partial<Omit<FinancialRecord, 'id'>>) => {
      const category = allFinancialCategories.find(c => c.id === data.categoryId);
      const isClientSecurityDeposit = data.categoryId === CLIENT_SECURITY_DEPOSIT_CATEGORY_ID;
      const isUsingDepositAsPayment = data.paymentMethod === "Uso de Depósito en Garantía";
      
      const isCreditPayment = category?.type === 'payment' && 
      (category?.name === 'Pago de Crédito' || data.categoryId === CREDIT_PAYMENT_CATEGORY); 
  
      if (isCreditPayment && data.clientId && data.amount) {
          const activeCredit = rawCredits.find(
              c => c.clientId === data.clientId && c.status === 'active'
          );
  
          if (!activeCredit) {
              throw new Error('No hay crédito activo para este cliente');
          }
  
          const result = await processCreditPayment(
              activeCredit.id,
              data.clientId,
              data.amount,
              data.paymentMethod,
              data.description,
              data.companyId || currentUser?.companyId || "",	// AGREGAR ""
              data.categoryId
          );
  
          if (!result.success) {
              throw new Error(result.error || 'Error al procesar pago de crédito');
          }
          await queryClient.invalidateQueries({ queryKey: ['financialRecords'] });
          await queryClient.invalidateQueries({ queryKey: ['credits'] });
          await queryClient.invalidateQueries({ queryKey: ['clients'] });
          await queryClient.invalidateQueries({ queryKey: ['creditPaymentSchedules'] });
          return;
      }

      if (isClientSecurityDeposit) {
          if (!data.clientId || !data.amount) {
              throw new Error("Client ID and amount are required for client security deposit.");
          }
          
          await runTransaction(db, async (transaction) => {
              const clientRef = doc(db, "clients", data.clientId!);
              const clientSnap = await transaction.get(clientRef);
              
              if (!clientSnap.exists()) {
                  throw new Error("Client not found.");
              }
              
              const clientData = clientSnap.data() as Client;
              const currentDeposit = clientData.securityDeposit ?? 0;
              
              transaction.update(clientRef, {
                  securityDeposit: currentDeposit + data.amount!,
                  updatedAt: new Date().toISOString()
              });
              
              const newRecordRef = doc(collection(db, "financialRecords"));
              const recordPayload = {
                  ...data,
                  type: 'income',
                  createdAt: new Date().toISOString(),
                  createdBy: currentUser?.uid || 'system',
                  isDeleted: false
              };
              transaction.set(newRecordRef, recordPayload);
              
              await logClientChange(transaction, data.clientId!, 'deposit_updated', currentUser?.uid || 'system', currentUser?.name || 'Sistema', `Depósito en garantía actualizado por ${formatCurrency(data.amount!)}`, 'securityDeposit', currentDeposit, currentDeposit + data.amount!);
          });

          await queryClient.invalidateQueries({ queryKey: ['financialRecords'] });
          await queryClient.invalidateQueries({ queryKey: ['clients'] });
          return;
      }

      if (isUsingDepositAsPayment) {
          if (!data.clientId || !data.amount) {
              throw new Error("Client and amount required");
          }
  
          await runTransaction(db, async (transaction) => {
              const clientRef = doc(db, "clients", data.clientId!);
              const clientSnap = await transaction.get(clientRef);
  
              if (!clientSnap.exists()) {
                  throw new Error("Client not found");
              }
  
              const clientData = clientSnap.data() as Client;
              const currentDeposit = clientData.securityDeposit ?? 0;
  
              if (data.amount! > currentDeposit) {
                  throw new Error("Payment amount exceeds available deposit.");
              }
  
              transaction.update(clientRef, {
                  securityDeposit: currentDeposit - data.amount!,
                  balance: (clientData.balance ?? 0) - data.amount!,
                  updatedAt: new Date().toISOString(),
              });
  
              const newRecordRef = doc(collection(db, "financialRecords"));
              const recordPayload = {
                  ...data,
                  type: 'payment',
                  createdAt: new Date().toISOString(),
                  createdBy: currentUser?.uid || 'system',
                  isDeleted: false
              };
              transaction.set(newRecordRef, recordPayload);
          });

          await queryClient.invalidateQueries({ queryKey: ['financialRecords'] });
          await queryClient.invalidateQueries({ queryKey: ['clients'] });
          return;
      }

      await addFinancialRecordAndUpdateBalances({
          ...data,
          type: category?.type === 'payment' ? 'payment' : 'income',
      } as any);

      await queryClient.invalidateQueries({ queryKey: ['financialRecords'] });
      await queryClient.invalidateQueries({ queryKey: ['clients'] });
      await queryClient.invalidateQueries({ queryKey: ['partners'] });
    }, [allFinancialCategories, addFinancialRecordAndUpdateBalances, currentUser, rawCredits, processCreditPayment, queryClient]);
    
    const createCreditWithFinancialRecord = useCallback(async (
      creditData: Omit<Credit, "id" | "isDeleted">,
      companyId: string,
    ): Promise<string | null> => {
      if (!currentUser?.uid) throw new Error("Usuario no autenticado");
  
      try {
        const creditGrantedCategory = allFinancialCategories.find(cat => cat.name === 'Crédito Otorgado' && cat.type === 'income');
        if (!creditGrantedCategory) throw new Error("⚠️ No se encontró la categoría 'Crédito Otorgado'.");
  
        const creditId = await runTransaction(db, async (transaction) => {
          const clientRef = doc(db, "clients", creditData.clientId);
          const clientSnap = await transaction.get(clientRef);
          if (!clientSnap.exists()) throw new Error("❌ Cliente no encontrado para la transacción");
  
          const creditRef = doc(collection(db, "credits"));
          const newCredit = { ...creditData, paidAmount: 0, paymentsMade: 0, remainingBalance: creditData.totalAmount, status: 'active' as const, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), isDeleted: false };
          transaction.set(creditRef, newCredit);
  
          for (let i = 0; i < creditData.numberOfPayments; i++) {
            const scheduleRef = doc(collection(db, "creditPaymentSchedules"));
            const dueDate = addWeeks(new Date(creditData.startDate), i);
            const scheduleData = { creditId: creditRef.id, paymentNumber: i + 1, dueDate: dueDate.toISOString(), amount: creditData.weeklyPayment, status: "pending" as const, createdAt: new Date().toISOString(), companyId: companyId };
            transaction.set(scheduleRef, scheduleData);
          }
  
          transaction.update(clientRef, { hasActiveCredit: true, activeCreditId: creditRef.id, updatedAt: new Date().toISOString() });
  
          const financialRecordRef = doc(collection(db, "financialRecords"));
          const financialRecordData = { companyId, clientId: creditData.clientId, vehicleId: creditData.vehicleId, categoryId: creditGrantedCategory.id, type: "income" as const, amount: creditData.totalAmount, paymentMethod: "credito", description: `Crédito otorgado - ${creditData.numberOfPayments} pagos de ${formatCurrency(creditData.weeklyPayment)}`, date: creditData.startDate, creditId: creditRef.id, creditGranted: true, isDeleted: false, createdBy: currentUser.uid, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
          transaction.set(financialRecordRef, financialRecordData);
          
          if(creditData.clientId) {
            await logClientChange(
                transaction,
                creditData.clientId,
                'credit_approved',
                currentUser.uid,
                currentUser.name || 'Sistema',
                `Crédito aprobado por ${formatCurrency(creditData.totalAmount)}`,
                'activeCreditId',
                null,
                creditRef.id
            );
          }

          return creditRef.id;
        });
  
        await queryClient.invalidateQueries({ queryKey: ['credits', 'clients', 'financialRecords', 'creditPaymentSchedules'] });
        return creditId;
      } catch (error) {
        console.error("❌ Error completo al crear crédito:", error);
        throw error;
      }
    },
    [currentUser, allFinancialCategories, queryClient]
  );
  
    const cancelCreditWithAdjustment = useCallback(async (creditId: string, reason?: string) => {
      if (!currentUser?.uid) throw new Error('Usuario no autenticado');
  
      try {
        await runTransaction(db, async (transaction) => {
          const creditRef = doc(db, 'credits', creditId);
          const creditSnap = await transaction.get(creditRef);
  
          if (!creditSnap.exists()) {
            console.error('❌ ERROR: Crédito no existe en la base de datos');
            throw new Error('Crédito no encontrado');
          }
  
          const creditData = creditSnap.data() as Credit;
  
          if (creditData.status !== 'active') {
            console.error('❌ ERROR: Crédito no está activo. Estado:', creditData.status);
            throw new Error('Crédito no está activo. Estado actual: ' + creditData.status);
          }
  
          const remainingBalance = creditData.remainingBalance || 0;
          const clientId = creditData.clientId;
          const vehicleId = creditData.vehicleId;
          const companyId = creditData.companyId;
  
          // 1. Cancelar el crédito
          transaction.update(creditRef, {
            status: 'cancelled',
            cancelledAt: new Date().toISOString(),
            cancelledBy: currentUser.uid,
            cancelReason: reason || 'Cancelación manual',
            updatedAt: new Date().toISOString()
          });
  
          // 2. Crear nota de crédito (registro financiero tipo payment) para ajustar el balance del cliente
          // Esto reduce la deuda del cliente por el monto restante del crédito
          if (remainingBalance > 0 && clientId) {
            const creditNoteRef = doc(collection(db, 'financialRecords'));
            transaction.set(creditNoteRef, {
              type: 'payment',
              amount: remainingBalance,
              description: `Nota de Crédito - Cancelación de crédito`,
              date: new Date().toISOString(),
              categoryId: 'credit-cancellation-adjustment',
              clientId: clientId,
              vehicleId: vehicleId || null,
              creditId: creditId,
              companyId: companyId || null,
              isCreditCancellation: true,
              createdBy: currentUser.uid,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              isDeleted: false
            });
  
            console.log(`💰 Nota de crédito creada por ${formatCurrency(remainingBalance)} para cliente ${clientId}`);
          }
  
          // 3. Liberar el vehículo
          if (vehicleId) {
            const vehicleRef = doc(db, 'vehicles', vehicleId);
            transaction.update(vehicleRef, {
              lockedByCredit: false,
              associatedCreditId: null,
              updatedAt: new Date().toISOString()
            });
            console.log(`🚗 Vehículo ${vehicleId} liberado`);
          }
  
          // 4. Actualizar el cliente
          if (clientId) {
            const clientRef = doc(db, 'clients', clientId);
            transaction.update(clientRef, {
              hasActiveCredit: false,
              activeCreditId: null,
              updatedAt: new Date().toISOString()
            });
          }
  
          // 5. Marcar los pagos pendientes del cronograma como cancelados
          const scheduleQuery = query(
            collection(db, 'creditPaymentSchedules'),
            where('creditId', '==', creditId),
            where('status', '==', 'pending')
          );
          const scheduleSnap = await getDocs(scheduleQuery);
  
          scheduleSnap.docs.forEach((scheduleDoc) => {
            transaction.update(doc(db, 'creditPaymentSchedules', scheduleDoc.id), {
              status: 'cancelled',
              updatedAt: new Date().toISOString()
            });
          });
  
          console.log(`📋 ${scheduleSnap.docs.length} pagos pendientes marcados como cancelados`);
        });
  
        await queryClient.invalidateQueries({ queryKey: ['credits'] });
        await queryClient.invalidateQueries({ queryKey: ['clients'] });
        await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
        await queryClient.invalidateQueries({ queryKey: ['financialRecords'] });
        await queryClient.invalidateQueries({ queryKey: ['creditPaymentSchedules'] });
  
        console.log('✅ Crédito cancelado exitosamente con nota de crédito');
      } catch (error) {
        console.error('Error al cancelar crédito:', error);
        throw error;
      }
    }, [currentUser, queryClient]);

    const deleteCreditWithCleanup = useCallback(async (creditId: string) => {
      try {
        console.log(`🧹 Iniciando eliminación de crédito y registros asociados: ${creditId}`);
        
        const q = query(collection(db, 'financialRecords'), where('creditId', '==', creditId));
        const snapshot = await getDocs(q);
        
        const batch = writeBatch(db);
        
        const creditRef = doc(db, 'credits', creditId);
        batch.delete(creditRef);
        console.log(`  - 🗑️ Marcado para eliminar: crédito ${creditId}`);
        
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
          console.log(`  - 🗑️ Marcado para eliminar: registro financiero ${doc.id}`);
        });
        
        await batch.commit();
        
        console.log(`✅ Eliminación completada: ${snapshot.docs.length + 1} documentos eliminados`);
        
        await queryClient.invalidateQueries({ queryKey: ['credits'] });
        await queryClient.invalidateQueries({ queryKey: ['financialRecords'] });
    
      } catch (error) {
        console.error(`❌ Error en deleteCreditWithCleanup:`, error);
        throw new Error("No se pudo completar la eliminación del crédito y sus registros.");
      }
    }, [queryClient]);
    
    const deleteCompanyMutation = useOptimisticMutation<void, { id: string }>(
        queryClient,
        ['companies'],
        ({ id }) => companyService.softDelete(id),
        'softDelete'
    );
  
    const deleteCompany = async (id: string) => {
        const companyVehicles = rawVehicles.filter(v => v.companyId === id && !v.isDeleted);
        if (companyVehicles.length > 0) {
            toast.error("Empresa en uso", { description: "No se puede eliminar una empresa con vehículos activos. Reasígnelos o elimínelos primero." });
            return;
        }
        await deleteCompanyMutation.mutateAsync({ id });
    };

    const vehicles = useMemo(() => rawVehicles.map(v => calculateVehicleMileageInfo(v, rawMileageLogs)), [rawVehicles, rawMileageLogs]);
    const { vehicleMetrics } = useVehicleAnalytics(rawVehicles, rawFinancialRecords, rawVehicleAssignmentLogs);
    const { clientMetrics } = useClientAnalytics(rawClients, rawFinancialRecords, vehicles);
    
    const clientBalances = useMemo(() => {
        const balances = new Map<string, number>();
        rawClients.forEach(client => {
          if (!client.isDeleted) balances.set(client.id, client.initialBalance || 0);
        });
        rawFinancialRecords.forEach(record => {
          if (record.isDeleted || !record.clientId || !balances.has(record.clientId)) return;
          
          let currentBalance = balances.get(record.clientId)!;
          if (record.type === 'income') {
              currentBalance += record.amount;
          } else if (record.type === 'payment' || record.paymentMethod === 'Uso de Depósito en Garantía') {
            currentBalance -= record.amount;
          }
          balances.set(record.clientId, currentBalance);
        });
        return Array.from(balances.entries()).map(([id, balance]) => ({ id, balance }));
    }, [rawClients, rawFinancialRecords]);

    const partnerBalances = useMemo(() => {
      if (!rawPartners || !rawPartners.length) return [];

      return rawPartners.filter(p => !p.isDeleted).map(partner => {
        const partnerVehicles = rawVehicles.filter(v => v.partnerId === partner.id && !v.isDeleted);
        const balance = calculatePartnerBalance(
          partner,
          partnerVehicles,
          rawFinancialRecords
        );

        // Construir nombre con fallback
        const firstName = partner.firstname || '';
        const lastName = partner.lastname || '';
        const fullName = `${firstName} ${lastName}`.trim();
        const displayName = fullName || partner.email || 'Socio sin nombre';

        return {
          id: partner.id,
          name: displayName,
          balance,
          vehicleCount: partnerVehicles.length,
          email: partner.email
        };
      });
    }, [rawPartners, rawVehicles, rawFinancialRecords]);
    
    const getVehicleById = useCallback((vehicleId: string) => vehicles.find(v => v.id === vehicleId), [vehicles]);
    const getVehicleWithDetailsById = useCallback((vehicleId: string) => vehicles.find(v => v.id === vehicleId), [vehicles]);
    const sendInternalMessage = useCallback(async (userIds: string[], title: string, body: string): Promise<void> => {
      try {
        console.log('📨 Enviando mensaje interno a:', userIds);
        toast.info("Función no implementada", { 
          description: "El envío de mensajes internos se debe implementar a través de una API." 
        });
      } catch (error) {
        console.error('❌ Error al enviar mensaje:', error);
        throw error;
      }
    }, []);
    
    const contextValue: DataContextType = {
      vehicles, 
      rawVehicles, 
      allVehicles, 
      allClients, 
      vehicleMetrics, 
      clients: rawClients, 
      clientMetrics, 
      clientBalances, 
      partnerBalances, 
      partners: rawPartners, 
      credits: rawCredits, 
      financialRecords: rawFinancialRecords, 
      notifications: rawNotifications, 
      mileageLogs: rawMileageLogs, 
      users: rawUsers, 
      vehicleAssignmentLogs: rawVehicleAssignmentLogs,
      companies: rawCompanies,
      rawCompanies,
      financialCategories: allFinancialCategories,
      messageTemplates: rawMessageTemplates,
      messageLogs: rawMessageLogs,
      creditPaymentSchedules: rawCreditPaymentSchedules,
      multas: rawMultas,
      loadingData,
      addVehicle: (data) => addVehicleMutation.mutateAsync(data),
      updateVehicle: (id, data) => updateVehicleMutation.mutateAsync({ ...data, id }),
      deleteVehicle: (id) => deleteVehicleMutation.mutateAsync({ id }),
      addClient: addClientWithVehicle,
      updateClient: updateClientWithVehicle,
      deleteClient: (id) => deleteClientMutation.mutateAsync({ id }),
      addPartner: (data) => addPartnerMutation.mutateAsync(data),
      updatePartner: (id, data) => updatePartnerMutation.mutateAsync({ ...data, id }),
      deletePartner: (id) => deletePartnerMutation.mutateAsync({ id }),
      addCompany: (data) => addCompanyMutation.mutateAsync(data as any),
      updateCompany: (id, data) => updateCompanyMutation.mutateAsync({ ...data, id } as any),
      deleteCompany,
      addFinancialCategory: async (data, returnObject?) => {
        const result = await addFinancialCategoryMutation.mutateAsync(data as any);
        return returnObject ? result : undefined;
      },
      updateFinancialCategory: (id, data) => updateFinancialCategoryMutation.mutateAsync({ ...data, id } as any),
      deleteFinancialCategory: (id) => deleteFinancialCategoryMutation.mutateAsync({ id }),
      addFinancialRecord: (data) => addFinancialRecordMutation.mutateAsync(data),
      updateFinancialRecord: (id, data) => updateFinancialRecordMutation.mutateAsync({ ...data, id } as any),
      addExpense,
      updateExpense: (id, data) => updateFinancialRecordMutation.mutateAsync({ ...data, id } as any),
      addIncome,
      updateIncome: (id, data) => updateFinancialRecordMutation.mutateAsync({ ...data, id } as any),
      addPayment: async (data) => {
        await addFinancialRecordMutation.mutateAsync({ ...data, type: 'payment', category: CLIENT_PAYMENT_CATEGORY } as any);
      },
      updatePayment: (id, data) => updateFinancialRecordMutation.mutateAsync({ ...data, id } as any),
      addCredit: (data) => addCreditMutation.mutateAsync(data),
      updateCredit: (id, data) => updateCreditMutation.mutateAsync({ ...data, id } as any),
      deleteCredit: (id) => deleteCreditMutation.mutateAsync({ id }),
      deactivateCredit: async (id) => {
        const credit = rawCredits.find(c => c.id === id);
        if (credit) {
          const batch = writeBatch(db);
          const vehicleRef = doc(db, 'vehicles', credit.vehicleId);
          batch.update(vehicleRef, { status: 'active', clientId: null });
          const creditRef = doc(db, 'credits', id);
          batch.update(creditRef, { status: 'inactive' });
          await batch.commit();
          await refreshData();
        }
      },
      addMessageTemplate: (data) => addMessageTemplateMutation.mutateAsync(data),
      updateMessageTemplate: (id, data) => updateMessageTemplateMutation.mutateAsync({ ...data, id } as any),
      deleteMessageTemplate: (id) => deleteMessageTemplateMutation.mutateAsync({ id }),
      sendInternalMessage,
      handleCreditUpdate: async () => false,
      addMileageLog: addMileageLog,
      updateMileageLog: (id, data) => updateMileageLogMutation.mutateAsync({ ...data, id } as any),
      deleteMileageLog: (id) => deleteMileageLogMutation.mutateAsync({ id }),
      markNotificationAsRead: async (id) => {
        const notif = rawNotifications.find(n => n.id === id);
        if (notif) {
          await notificationService.update(id, {
            isRead: true,
            readAt: new Date().toISOString()
          });
        }
        queryClient.setQueryData<Notification[]>(['notifications'], (old) => 
          old ? old.map(n => n.id === id ? {...n, isRead: true} : n) : []
        );
      },
      getVehicleById, 
      getVehicleWithDetailsById, 
      refreshData, 
      selectedCompanyId, 
      setSelectedCompanyId,
      createCreditWithFinancialRecord,
      processCreditPayment,
      cancelCredit: cancelCreditWithAdjustment,
      cancelCreditWithAdjustment,
      deleteFinancialRecord,
      deleteCreditWithCleanup,
      addMulta: async (data: Omit<Multa, 'id'>) => {
        const multaId = await runTransaction(db, async (transaction) => {
            const clientRef = doc(db, 'clients', data.clientId!);
            const clientSnap = await transaction.get(clientRef);
            if (!clientSnap.exists()) {
                throw new Error('Cliente no encontrado');
            }
            
            const multaCategoryQuery = query(
                collection(db, 'financialCategories'),
                where('name', '==', 'Multa'),
                where('isDefault', '==', true),
                limit(1)
            );
            const multaCategorySnapshot = await getDocs(multaCategoryQuery);
            if (multaCategorySnapshot.empty) {
                throw new Error('Categoría "Multa" no encontrada.');
            }
            const multaCategoryId = multaCategorySnapshot.docs[0].id;
    
            const multaRef = doc(collection(db, 'multas'));
            transaction.set(multaRef, {
                ...data,
                createdAt: data.createdAt || new Date().toISOString(),
            });
    
            const finRecordRef = doc(collection(db, 'financialRecords'));
            transaction.set(finRecordRef, {
                clientId: data.clientId,
                vehicleId: data.vehicleId,
                categoryId: multaCategoryId,
                category: 'Multa',
                type: 'income',
                amount: data.total,
                description: `Multa: ${data.descripcion}${data.folio ? ` (Folio: ${data.folio})` : ''}`,
                date: data.fechaInfraccion,
                multaId: multaRef.id,
                isPending: true,
                isDeleted: false,
                createdBy: data.createdBy,
                createdAt: new Date().toISOString(),
                companyId: data.companyId,
            });
    
            return multaRef.id;
        });
    
        await queryClient.invalidateQueries({ queryKey: ['multas'] });
        await queryClient.invalidateQueries({ queryKey: ['clients'] });
        await queryClient.invalidateQueries({ queryKey: ['financialRecords'] });
    
        return { id: multaId, ...data } as Multa;
    },
      updateMulta: async (id: string, data: Partial<Multa>) => {
        await multaService.update(id, data);
        await queryClient.invalidateQueries({ queryKey: ['multas'] });
      },
      deleteMulta: async (id: string) => {
        await multaService.softDelete(id);
        await queryClient.invalidateQueries({ queryKey: ['multas'] });
      },
      processMultaPayment: async (multaId: string, paymentData: Omit<FinancialRecord, 'id' | 'uid' | 'type' | 'category'>) => {
        await runTransaction(db, async (transaction) => {
          // 1. Obtener la multa
          const multaRef = doc(db, 'multas', multaId);
          const multaSnap = await transaction.get(multaRef);

          if (!multaSnap.exists()) {
            throw new Error('Multa no encontrada');
          }

          const multa = multaSnap.data() as Multa;

          if (multa.status === 'pagada') {
            throw new Error('Esta multa ya fue pagada');
          }

          // 2. Obtener la categoría "Pago de Multa"
          const pagoMultaCategoryQuery = query(
            collection(db, 'financialCategories'),
            where('name', '==', 'Pago de Multa'),
            where('isDefault', '==', true),
            limit(1)
          );
          const pagoMultaCategorySnapshot = await getDocs(pagoMultaCategoryQuery);

          if (pagoMultaCategorySnapshot.empty) {
            throw new Error('Categoría "Pago de Multa" no encontrada. Recarga la página.');
          }

          const pagoMultaCategory = pagoMultaCategorySnapshot.docs[0];
          const pagoMultaCategoryId = pagoMultaCategory.id;

          // 3. Crear registro de pago
          const paymentRef = doc(collection(db, 'financialRecords'));
          transaction.set(paymentRef, {
            ...paymentData,
            type: 'payment',
            category: 'Pago de Multa',
            categoryId: pagoMultaCategoryId,
            multaId: multaId,
            description: paymentData.description || `Pago de multa${multa.folio ? ` (Folio: ${multa.folio})` : ''}: ${multa.descripcion}`,
            isPending: false,
            isDeleted: false,
            createdAt: new Date().toISOString(),
          });

          // 4. Actualizar estado de la multa
          transaction.update(multaRef, {
            status: 'pagada',
            fechaPago: paymentData.date,
            updatedAt: new Date().toISOString(),
          });

          // 5. Actualizar el registro financiero original de la multa (marcar como pagado)
          const finRecordQuery = query(
            collection(db, 'financialRecords'),
            where('multaId', '==', multaId),
            where('type', '==', 'income'),
            limit(1)
          );
          const finRecordSnapshot = await getDocs(finRecordQuery);

          if (!finRecordSnapshot.empty) {
            const finRecordRef = finRecordSnapshot.docs[0].ref;
            transaction.update(finRecordRef, {
              isPending: false,
              updatedAt: new Date().toISOString(),
            });
          }

          // 6. El balance del cliente se ajusta automáticamente por el sistema de pagos
          // No es necesario hacer nada extra aquí
        });

        // Invalidar queries
        await queryClient.invalidateQueries({ queryKey: ['multas'] });
        await queryClient.invalidateQueries({ queryKey: ['financialRecords'] });
        await queryClient.invalidateQueries({ queryKey: ['clients'] });
      },
    };

    if (loadingData) {
        return <GlobalLoader />;
    }

    return <DataContext.Provider value={{...contextValue, sendInternalMessage}}>{children}</DataContext.Provider>;
}

// Custom hook to use the DataContext
export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}



    
