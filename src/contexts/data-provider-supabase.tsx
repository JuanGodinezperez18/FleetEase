/**
 * @fileoverview Data Provider con Supabase
 *
 * Provee el modelo de dominio (camelCase) a la UI adaptando las filas
 * snake_case que devuelve Supabase. La UI consume @/types (dominio).
 */

"use client";

import React, { createContext, useState, useEffect, useCallback, useMemo, ReactNode, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './auth-provider-supabase';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { buildVehicleCreditUnlockPayload } from '@/lib/credit-creation';
import { createFinancialRecord, updateFinancialRecordMetadata } from '@/lib/financial-rpc';
import { createCreditAtomic } from '@/lib/credit-rpc';
import { buildAssignmentLogPayload, checkVehicleAssignmentAvailability, type NewAssignmentInput } from '@/lib/vehicle-assignment';
import type {
  Client,
  Vehicle,
  Partner,
  Credit,
  FinancialRecord,
  MileageLog,
  Notification,
  VehicleAssignmentLog,
  Company,
  FinancialCategory,
  MessageTemplate,
  MessageLog,
  CreditPaymentSchedule,
  Multa,
} from '@/types/supabase';
import {
  toDomainClient,
  toDomainVehicle,
  toDomainPartner,
  toDomainCredit,
  toDomainFinancialRecord,
  toDomainMileageLog,
  toDomainNotification,
  toDomainVehicleAssignmentLog,
  toDomainCompany,
  toDomainFinancialCategory,
  toDomainMessageTemplate,
  toDomainMessageLog,
  toDomainCreditPaymentSchedule,
  toDomainMulta,
  toSbClient,
  toSbVehicle,
  toSbPartner,
  toSbCredit,
  toSbFinancialRecord,
  toSbMileageLog,
  toSbNotification,
  toSbVehicleAssignmentLog,
  toSbCompany,
  toSbFinancialCategory,
  toSbMessageTemplate,
  toSbMessageLog,
  toSbCreditPaymentSchedule,
  toSbMulta,
} from '@/lib/domain-mappers';
import { formatCurrency } from '@/lib/utils';
import { useVehicleAnalytics } from '@/hooks/use-vehicle-analytics';
import { useClientAnalytics } from '@/hooks/use-client-analytics';

// =====================================================
// TIPOS DE DOMINIO EXPUESTOS POR EL CONTEXT
// =====================================================

import type {
  Client as DomainClient,
  Vehicle as DomainVehicle,
  Partner as DomainPartner,
  Credit as DomainCredit,
  FinancialRecord as DomainFinancialRecord,
  MileageLog as DomainMileageLog,
  Notification as DomainNotification,
  VehicleAssignmentLog as DomainVehicleAssignmentLog,
  Company as DomainCompany,
  FinancialCategory as DomainFinancialCategory,
  MessageTemplate as DomainMessageTemplate,
  MessageLog as DomainMessageLog,
  CreditPaymentSchedule as DomainCreditPaymentSchedule,
  Multa as DomainMulta,
  VehicleWithMileage as DomainVehicleWithMileage,
} from '@/types';

export interface DataContextType {
  vehicles: DomainVehicleWithMileage[];
  rawVehicles: DomainVehicle[];
  allVehicles: DomainVehicle[];
  allClients: DomainClient[];
  clients: DomainClient[];
  allClientsBase: DomainClient[];
  partners: DomainPartner[];
  credits: DomainCredit[];
  financialRecords: DomainFinancialRecord[];
  notifications: DomainNotification[];
  mileageLogs: DomainMileageLog[];
  users: any[];
  vehicleAssignmentLogs: DomainVehicleAssignmentLog[];
  companies: DomainCompany[];
  rawCompanies: DomainCompany[];
  financialCategories: DomainFinancialCategory[];
  messageTemplates: DomainMessageTemplate[];
  messageLogs: DomainMessageLog[];
  creditPaymentSchedules: DomainCreditPaymentSchedule[];
  multas: DomainMulta[];
  loadingData: boolean;
  selectedCompanyId: string | null;
  setSelectedCompanyId: (id: string | null) => void;
  clientBalances: { id: string; balance: number }[];
  partnerBalances: { id: string; name: string; balance: number; vehicleCount?: number; email?: string }[];
  vehicleMetrics: ReturnType<typeof useVehicleAnalytics>['vehicleMetrics'];
  clientMetrics: ReturnType<typeof useClientAnalytics>['clientMetrics'];

  // Vehicle operations
  addVehicle: (data: Partial<DomainVehicle>) => Promise<DomainVehicle>;
  updateVehicle: (id: string, data: Partial<DomainVehicle>) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;

  // Client operations
  addClient: (data: Partial<DomainClient>) => Promise<DomainClient>;
  updateClient: (id: string, data: Partial<DomainClient>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;

  // Partner operations
  addPartner: (data: Partial<DomainPartner>) => Promise<DomainPartner>;
  updatePartner: (id: string, data: Partial<DomainPartner>) => Promise<void>;
  deletePartner: (id: string) => Promise<void>;

  // Company operations
  addCompany: (data: Partial<DomainCompany>) => Promise<DomainCompany>;
  updateCompany: (id: string, data: Partial<DomainCompany>) => Promise<void>;
  deleteCompany: (id: string) => Promise<void>;

  // Financial operations
  addFinancialCategory: (data: Partial<DomainFinancialCategory>) => Promise<any>;
  updateFinancialCategory: (id: string, data: Partial<DomainFinancialCategory>) => Promise<void>;
  deleteFinancialCategory: (id: string) => Promise<void>;
  addFinancialRecord: (data: Partial<DomainFinancialRecord>) => Promise<DomainFinancialRecord>;
  updateFinancialRecord: (id: string, data: Partial<DomainFinancialRecord>) => Promise<void>;
  deleteFinancialRecord: (id: string, onSuccess?: () => void) => Promise<void>;
  addExpense: (data: Partial<DomainFinancialRecord>) => Promise<void>;
  updateExpense: (id: string, data: Partial<DomainFinancialRecord>) => Promise<void>;
  addIncome: (data: Partial<DomainFinancialRecord>) => Promise<void>;
  updateIncome: (id: string, data: Partial<DomainFinancialRecord>) => Promise<void>;
  addPayment: (data: Partial<DomainFinancialRecord>) => Promise<void>;
  updatePayment: (id: string, data: Partial<DomainFinancialRecord>) => Promise<void>;

  // Credit operations
  addCredit: (data: Partial<DomainCredit>) => Promise<DomainCredit>;
  updateCredit: (id: string, data: Partial<DomainCredit>) => Promise<void>;
  deleteCredit: (id: string) => Promise<void>;
  deactivateCredit: (id: string) => Promise<void>;
  createCreditWithFinancialRecord: (creditData: Partial<DomainCredit>, companyId: string) => Promise<string | null>;
  processCreditPayment: (creditId: string, clientId: string, amount: number, paymentMethod?: string, description?: string, companyId?: string, categoryId?: string) => Promise<any>;
  cancelCredit: (creditId: string) => Promise<void>;
  cancelCreditWithAdjustment: (creditId: string, reason?: string) => Promise<void>;
  deleteCreditWithCleanup: (creditId: string) => Promise<void>;
  createVehicleAssignment: (input: NewAssignmentInput) => Promise<void>;
  endVehicleAssignment: (assignmentLogId: string, vehicleId: string) => Promise<void>;

  // Mileage operations
  addMileageLog: (log: Partial<DomainMileageLog>) => Promise<void>;
  updateMileageLog: (id: string, log: Partial<DomainMileageLog>) => Promise<void>;
  deleteMileageLog: (id: string) => Promise<void>;

  // Notification operations
  markNotificationAsRead: (id: string) => Promise<void>;

  // Message operations
  addMessageTemplate: (data: Partial<DomainMessageTemplate>) => Promise<DomainMessageTemplate>;
  updateMessageTemplate: (id: string, data: Partial<DomainMessageTemplate>) => Promise<void>;
  deleteMessageTemplate: (id: string) => Promise<void>;
  sendInternalMessage: (userIds: string[], title: string, body: string) => Promise<void>;

  // Multa operations
  addMulta: (data: Partial<DomainMulta>) => Promise<DomainMulta>;
  updateMulta: (id: string, data: Partial<DomainMulta>) => Promise<void>;
  deleteMulta: (id: string) => Promise<void>;
  processMultaPayment: (multaId: string, paymentData: Partial<DomainFinancialRecord>) => Promise<void>;

  // Utility operations
  getVehicleById: (id: string) => DomainVehicleWithMileage | undefined;
  getVehicleWithDetailsById: (id: string) => DomainVehicleWithMileage | undefined;
  refreshData: () => Promise<void>;
  handleCreditUpdate: (clientId: string, amount: number, isDownPayment?: boolean) => Promise<boolean>;
}

export const DataContext = createContext<DataContextType | undefined>(undefined);

// =====================================================
// CONSTANTES (exportadas para compatibilidad)
// =====================================================

// Resuelve el id real (uuid) de la categoría financiera marcada con el
// 'affects' dado. category_id es NOT NULL en Postgres, así que nunca se
// puede insertar un id hardcodeado/heredado (p.ej. de Firestore) como
// fallback: hay que resolverlo contra la tabla real. Lanza un error claro
// y accionable si no existe ninguna categoría configurada con ese affects.
async function resolveCategoryIdByAffects(
  affects: 'credit_payment' | 'credit_granted' | 'security_deposit' | 'client_balance' | 'partner_balance' | 'driver_payment' | 'none',
  friendlyName: string
): Promise<string> {
  const { data: category, error } = await supabase
    .from('financial_categories')
    .select('id')
    .eq('affects', affects)
    .limit(1)
    .maybeSingle();
  if (error || !category) {
    throw new Error(`No existe una categoría de "${friendlyName}" configurada (affects=${affects}). Créala en Configuración > Categorías Financieras.`);
  }
  return category.id;
}

export const CREDIT_GRANTED_CATEGORY = 'Crédito Otorgado';
export const CREDIT_PAYMENT_CATEGORY = 'vKeQhlbdBmZhPw8ZmJEX';
export const CLIENT_PAYMENT_CATEGORY = "Abono de Cliente";
export const DRIVER_PAYMENT_CATEGORY = "Pago a Conductor";
export const MAINTENANCE_CATEGORY = "Mantenimiento";
export const SECURITY_DEPOSIT_CATEGORY = "Depósito en Garantía";
export const CLIENT_SECURITY_DEPOSIT_CATEGORY_ID = "66NXhL4RKMnc65R5GcKQ";
export const PARTNER_PAYMENT_CATEGORY_NAME = 'Pago a Socio';
export let PARTNER_PAYMENT_CATEGORY_ID: string | undefined;

// =====================================================
// HELPERS
// =====================================================

// Calcular información de kilometraje del vehículo
function calculateVehicleMileageInfo(vehicle: DomainVehicle, logs: DomainMileageLog[]): DomainVehicleWithMileage {
  const vehicleLogs = logs
    .filter(log => log.vehicleId === vehicle.id && !log.isDeleted)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const currentMileage = vehicle.currentMileage || 0;
  const lastMaintenanceMileage = vehicle.lastMaintenanceMileage || 0;
  const maintenanceInterval = vehicle.maintenanceInterval || 5000;
  const kmToNextMaintenance = maintenanceInterval - (currentMileage - lastMaintenanceMileage);

  // Calcular promedio diario (últimos 30 días)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentLogs = vehicleLogs.filter(log => new Date(log.date) >= thirtyDaysAgo);
  const dailyAveragekm = recentLogs.length > 1
    ? (recentLogs[0].mileage - recentLogs[recentLogs.length - 1].mileage) / 30
    : 0;

  return {
    ...vehicle,
    displayCurrentMileage: currentMileage.toLocaleString(),
    displayLastMaintMileage: lastMaintenanceMileage.toLocaleString(),
    displayNextMaintDueAt: (currentMileage + kmToNextMaintenance).toLocaleString(),
    displayKmToNextMaintenance: kmToNextMaintenance.toLocaleString(),
    kmToNextMaintenance,
    dailyAveragekm,
  };
}

// Calcular balance de socio
export function calculatePartnerBalance(
  partner: DomainPartner,
  partnerVehicles: DomainVehicle[],
  financialRecords: DomainFinancialRecord[]
): number {
  const partnerVehicleIds = new Set(partnerVehicles.map(v => v.id));

  const totalIncome = financialRecords
    .filter(r =>
      r.type === 'income' &&
      r.vehicleId &&
      partnerVehicleIds.has(r.vehicleId) &&
      !r.isDeleted
    )
    .reduce((sum, r) => sum + r.amount, 0);

  const totalExpenses = financialRecords
    .filter(r =>
      r.type === 'expense' &&
      r.vehicleId &&
      partnerVehicleIds.has(r.vehicleId) &&
      r.paymentMethod !== 'partner_pays' &&
      !r.isDeleted
    )
    .reduce((sum, r) => sum + r.amount, 0);

  const allPartnerPayments = financialRecords
    .filter(r =>
      r.type === 'payment' &&
      r.partnerId === partner.id &&
      !r.isDeleted
    );

  const totalPaymentsAlreadyMade = allPartnerPayments.reduce((sum, r) => sum + r.amount, 0);

  return (partner.initialBalance || 0) + totalIncome - totalExpenses - totalPaymentsAlreadyMade;
}

// =====================================================
// PROVIDER
// =====================================================

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
        if (savedCompanyId === 'all') {
          setSelectedCompanyIdState(null);
        } else if (savedCompanyId) {
          // Respeta una selección válida existente en localStorage.
          setSelectedCompanyIdState(savedCompanyId);
        } else if (currentUser.companyId) {
          // No hay selección guardada: inicializa con la empresa del
          // SuperAdmin en vez de dejarlo en null indefinidamente.
          setSelectedCompanyIdState(currentUser.companyId);
        } else {
          setSelectedCompanyIdState(null);
        }
      } else {
        setSelectedCompanyIdState(currentUser.companyId || null);
      }
    }
  }, [currentUser, authLoading, isSuperAdmin]);

  const companyIdForFiltering = useMemo(() => {
    if (!currentUser) return undefined;
    if (isSuperAdmin) {
      // Usa selectedCompanyId si existe; si no, cae a currentUser.companyId
      // en vez de quedar en null mientras se resuelve el estado inicial.
      return selectedCompanyId || currentUser.companyId || null;
    }
    return currentUser.companyId;
  }, [currentUser, isSuperAdmin, selectedCompanyId]);

  // =====================================================
  // QUERIES
  // =====================================================

  // Clients Query
  const { data: allClients = [], isLoading: loadingClients } = useQuery<DomainClient[]>({
    queryKey: ['clients', companyIdForFiltering],
    queryFn: async () => {
      let query = supabase.from('clients').select('*').eq('is_deleted', false);

      if (companyIdForFiltering) {
        query = query.eq('company_id', companyIdForFiltering);
      }

      const { data, error } = await query.limit(2000);
      if (error) throw error;
      return (data || []).map(toDomainClient);
    },
    enabled: !!currentUser && (!isSuperAdmin || !!companyIdForFiltering),
    staleTime: 2 * 60 * 1000,
  });

  // Vehicles Query
  const { data: allVehicles = [], isLoading: loadingVehicles } = useQuery<DomainVehicle[]>({
    queryKey: ['vehicles', companyIdForFiltering],
    queryFn: async () => {
      let query = supabase.from('vehicles').select('*').eq('is_deleted', false);

      if (companyIdForFiltering) {
        query = query.eq('company_id', companyIdForFiltering);
      }

      const { data, error } = await query.limit(2000);
      if (error) throw error;
      return (data || []).map(toDomainVehicle);
    },
    enabled: !!currentUser && (!isSuperAdmin || !!companyIdForFiltering),
    staleTime: 2 * 60 * 1000,
  });

  // Partners Query
  const { data: allPartners = [], isLoading: loadingPartners } = useQuery<DomainPartner[]>({
    queryKey: ['partners', companyIdForFiltering],
    queryFn: async () => {
      let query = supabase.from('partners').select('*').eq('is_deleted', false);

      if (companyIdForFiltering) {
        query = query.eq('company_id', companyIdForFiltering);
      }

      const { data, error } = await query.limit(1000);
      if (error) throw error;
      return (data || []).map(toDomainPartner);
    },
    enabled: !!currentUser && (!isSuperAdmin || !!companyIdForFiltering),
    staleTime: 10 * 60 * 1000,
  });

  // Credits Query
  const { data: allCredits = [], isLoading: loadingCredits } = useQuery<DomainCredit[]>({
    queryKey: ['credits', companyIdForFiltering],
    queryFn: async () => {
      let query = supabase.from('credits').select('*').eq('is_deleted', false);

      if (companyIdForFiltering) {
        query = query.eq('company_id', companyIdForFiltering);
      }

      const { data, error } = await query.limit(1500);
      if (error) throw error;
      return (data || []).map(toDomainCredit);
    },
    enabled: !!currentUser && (!isSuperAdmin || !!companyIdForFiltering),
    staleTime: 10 * 60 * 1000,
  });

  // Financial Records Query
  const { data: allFinancialRecords = [], isLoading: loadingFinancialRecords } = useQuery<DomainFinancialRecord[]>({
    queryKey: ['financial_records', companyIdForFiltering],
    queryFn: async () => {
      let query = supabase
        .from('financial_records')
        .select('*')
        .eq('is_deleted', false)
        .order('date', { ascending: false });

      if (companyIdForFiltering) {
        query = query.eq('company_id', companyIdForFiltering);
      }

      const { data, error } = await query.limit(5000);
      if (error) throw error;
      return (data || []).map(toDomainFinancialRecord);
    },
    enabled: !!currentUser && (!isSuperAdmin || !!companyIdForFiltering),
    staleTime: 2 * 60 * 1000,
  });

  // Mileage Logs Query
  const { data: allMileageLogs = [], isLoading: loadingMileageLogs } = useQuery<DomainMileageLog[]>({
    queryKey: ['mileage_logs', companyIdForFiltering],
    queryFn: async () => {
      let query = supabase
        .from('mileage_logs')
        .select('*')
        .eq('is_deleted', false)
        .order('date', { ascending: false });

      if (companyIdForFiltering) {
        query = query.eq('company_id', companyIdForFiltering);
      }

      const { data, error } = await query.limit(5000);
      if (error) throw error;
      return (data || []).map(toDomainMileageLog);
    },
    enabled: !!currentUser && (!isSuperAdmin || !!companyIdForFiltering),
    staleTime: 15 * 60 * 1000,
  });

  // Companies Query
  const { data: allCompanies = [], isLoading: loadingCompanies } = useQuery<DomainCompany[]>({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('is_deleted', false);
      if (error) throw error;
      return (data || []).map(toDomainCompany);
    },
    enabled: !!currentUser && isSuperAdmin,
  });

  // Financial Categories Query
  const { data: allFinancialCategories = [], isLoading: loadingCategories } = useQuery<DomainFinancialCategory[]>({
    queryKey: ['financial_categories', companyIdForFiltering],
    queryFn: async () => {
      let query = supabase.from('financial_categories').select('*');

      if (companyIdForFiltering) {
        query = query.or(`company_id.eq.${companyIdForFiltering},company_id.is.null`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Eliminar duplicados
      const categoryMap = new Map<string, DomainFinancialCategory>();
      (data || []).forEach(cat => {
        const domainCat = toDomainFinancialCategory(cat);
        if (!categoryMap.has(domainCat.id)) {
          categoryMap.set(domainCat.id, domainCat);
        }
      });

      return Array.from(categoryMap.values());
    },
    enabled: !!currentUser && (!isSuperAdmin || !!companyIdForFiltering),
  });

  // Notifications Query
  const { data: allNotifications = [] } = useQuery<DomainNotification[]>({
    queryKey: ['notifications', companyIdForFiltering],
    queryFn: async () => {
      let query = supabase.from('notifications').select('*');

      if (companyIdForFiltering) {
        query = query.eq('company_id', companyIdForFiltering);
      }

      const { data, error } = await query.order('date', { ascending: false });
      if (error) throw error;
      return (data || []).map(toDomainNotification);
    },
    enabled: !!currentUser && (!isSuperAdmin || !!companyIdForFiltering),
  });

  // Message Templates Query
  const { data: allMessageTemplates = [] } = useQuery<DomainMessageTemplate[]>({
    queryKey: ['message_templates', companyIdForFiltering],
    queryFn: async () => {
      let query = supabase.from('message_templates').select('*').eq('is_deleted', false);

      if (companyIdForFiltering) {
        query = query.eq('company_id', companyIdForFiltering);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(toDomainMessageTemplate);
    },
    enabled: !!currentUser && (!isSuperAdmin || !!companyIdForFiltering),
    staleTime: 5 * 60 * 1000,
  });

  // Credit Payment Schedules Query
  const { data: allCreditPaymentSchedules = [] } = useQuery<DomainCreditPaymentSchedule[]>({
    queryKey: ['credit_payment_schedules', companyIdForFiltering],
    queryFn: async () => {
      let query = supabase.from('credit_payment_schedules').select('*');

      if (companyIdForFiltering) {
        query = query.eq('company_id', companyIdForFiltering);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(toDomainCreditPaymentSchedule);
    },
    enabled: !!currentUser && (!isSuperAdmin || !!companyIdForFiltering),
    staleTime: 5 * 60 * 1000,
  });

  // Multas Query
  const { data: allMultas = [] } = useQuery<DomainMulta[]>({
    queryKey: ['multas', companyIdForFiltering],
    queryFn: async () => {
      let query = supabase.from('multas').select('*').eq('is_deleted', false);

      if (companyIdForFiltering) {
        query = query.eq('company_id', companyIdForFiltering);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(toDomainMulta);
    },
    enabled: !!currentUser && (!isSuperAdmin || !!companyIdForFiltering),
    staleTime: 5 * 60 * 1000,
  });

  // Vehicle Assignment Logs Query
  const { data: allVehicleAssignmentLogs = [] } = useQuery<DomainVehicleAssignmentLog[]>({
    queryKey: ['vehicle_assignment_logs', companyIdForFiltering],
    queryFn: async () => {
      let query = supabase.from('vehicle_assignment_logs').select('*');

      if (companyIdForFiltering) {
        query = query.eq('company_id', companyIdForFiltering);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(toDomainVehicleAssignmentLog);
    },
    enabled: !!currentUser && (!isSuperAdmin || !!companyIdForFiltering),
    staleTime: 5 * 60 * 1000,
  });

  // =====================================================
  // MEMOIZED VALUES
  // =====================================================

  const vehicles = useMemo(() =>
    allVehicles.map(v => calculateVehicleMileageInfo(v, allMileageLogs)),
    [allVehicles, allMileageLogs]
  );

  const { vehicleMetrics } = useVehicleAnalytics(allVehicles, allFinancialRecords, allVehicleAssignmentLogs);
  const { clientMetrics } = useClientAnalytics(allClients, allFinancialRecords, vehicles);

  const clientBalances = useMemo(() => {
    const balances = new Map<string, number>();

    allClients.forEach(client => {
      if (!client.isDeleted) {
        balances.set(client.id, client.initialBalance || 0);
      }
    });

    allFinancialRecords.forEach(record => {
      if (record.isDeleted || !record.clientId || !balances.has(record.clientId)) return;

      // Depósito en Garantía es dinero retenido, no una cuenta por cobrar.
      // Debe permanecer visible en transacciones y securityDeposit, pero no puede aumentar la deuda del cliente.
      if (record.category === SECURITY_DEPOSIT_CATEGORY) return;

      let currentBalance = balances.get(record.clientId)!;
      if (record.type === 'income') {
        currentBalance += record.amount;
      } else if (record.type === 'payment') {
        currentBalance -= record.amount;
      }
      balances.set(record.clientId, currentBalance);
    });

    return Array.from(balances.entries()).map(([id, balance]) => ({ id, balance }));
  }, [allClients, allFinancialRecords]);

  const partnerBalances = useMemo(() => {
    if (!allPartners?.length) return [];

    return allPartners.filter(p => !p.isDeleted).map(partner => {
      const partnerVehicles = allVehicles.filter(v => v.partnerId === partner.id && !v.isDeleted);
      const balance = calculatePartnerBalance(partner, partnerVehicles, allFinancialRecords);

      const firstName = partner.firstname || '';
      const lastName = partner.lastname || '';
      const fullName = `${firstName} ${lastName}`.trim();
      const displayName = fullName || partner.email || 'Socio sin nombre';

      return {
        id: partner.id,
        name: displayName,
        balance,
        vehicleCount: partnerVehicles.length,
        email: partner.email || undefined,
      };
    });
  }, [allPartners, allVehicles, allFinancialRecords]);

  const rawCompanies = useMemo(() =>
    isSuperAdmin ? allCompanies : allCompanies.filter(c => c.id === currentUser?.companyId),
    [allCompanies, isSuperAdmin, currentUser]
  );

  const loadingData = useMemo(() => {
    return authLoading || loadingClients || loadingVehicles || loadingFinancialRecords || loadingCategories;
  }, [authLoading, loadingClients, loadingVehicles, loadingFinancialRecords, loadingCategories]);

  // =====================================================
  // MUTATIONS
  // =====================================================

  const refreshData = useCallback(async () => {
    await queryClient.invalidateQueries();
  }, [queryClient]);

  // Vehicle Mutations
  const addVehicleMutation = useMutation({
    mutationFn: async (data: Partial<DomainVehicle>) => {
      const { data: result, error } = await supabase
        .from('vehicles')
        .insert(toSbVehicle(data) as any)
        .select()
        .single();
      if (error) throw error;
      return toDomainVehicle(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Vehículo agregado exitosamente');
    },
    onError: (error) => {
      toast.error('Error al agregar vehículo', { description: error.message });
    },
  });

  const updateVehicleMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<DomainVehicle> & { id: string }) => {
      const { error } = await supabase
        .from('vehicles')
        .update(toSbVehicle(data) as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Vehículo actualizado');
    },
    onError: (error) => {
      toast.error('Error al actualizar vehículo', { description: error.message });
    },
  });

  const deleteVehicleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vehicles')
        .update({ is_deleted: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Vehículo eliminado');
    },
    onError: (error) => {
      toast.error('Error al eliminar vehículo', { description: error.message });
    },
  });

  // Client Mutations
  const addClientMutation = useMutation({
    mutationFn: async (data: Partial<DomainClient>) => {
      const { data: result, error } = await supabase
        .from('clients')
        .insert(toSbClient(data) as any)
        .select()
        .single();
      if (error) throw error;
      return toDomainClient(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente agregado exitosamente');
    },
    onError: (error) => {
      toast.error('Error al agregar cliente', { description: error.message });
    },
  });

  const updateClientMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<DomainClient> & { id: string }) => {
      const { error } = await supabase
        .from('clients')
        .update(toSbClient(data) as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente actualizado');
    },
    onError: (error) => {
      toast.error('Error al actualizar cliente', { description: error.message });
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('clients')
        .update({ is_deleted: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente eliminado');
    },
    onError: (error) => {
      toast.error('Error al eliminar cliente', { description: error.message });
    },
  });

  // Partner Mutations
  const addPartnerMutation = useMutation({
    mutationFn: async (data: Partial<DomainPartner>) => {
      const { data: result, error } = await supabase
        .from('partners')
        .insert({ ...toSbPartner(data), is_deleted: false } as any)
        .select()
        .single();
      if (error) throw error;
      return toDomainPartner(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      toast.success('Socio agregado exitosamente');
    },
    onError: (error) => {
      toast.error('Error al agregar socio', { description: error.message });
    },
  });

  const updatePartnerMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<DomainPartner> & { id: string }) => {
      const { error } = await supabase
        .from('partners')
        .update(toSbPartner(data) as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      toast.success('Socio actualizado');
    },
    onError: (error) => {
      toast.error('Error al actualizar socio', { description: error.message });
    },
  });

  const deletePartnerMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('partners')
        .update({ is_deleted: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      toast.success('Socio eliminado');
    },
    onError: (error) => {
      toast.error('Error al eliminar socio', { description: error.message });
    },
  });

  // Company Mutations
  const addCompanyMutation = useMutation({
    mutationFn: async (data: Partial<DomainCompany>) => {
      const { data: result, error } = await supabase
        .from('companies')
        .insert(toSbCompany(data) as any)
        .select()
        .single();
      if (error) throw error;
      return toDomainCompany(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Empresa agregada exitosamente');
    },
    onError: (error) => {
      toast.error('Error al agregar empresa', { description: error.message });
    },
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<DomainCompany> & { id: string }) => {
      const { error } = await supabase
        .from('companies')
        .update(toSbCompany(data) as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Empresa actualizada');
    },
    onError: (error) => {
      toast.error('Error al actualizar empresa', { description: error.message });
    },
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: async (id: string) => {
      // Verificar si tiene vehículos
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('id')
        .eq('company_id', id)
        .eq('is_deleted', false);

      if (vehicles && vehicles.length > 0) {
        throw new Error('No se puede eliminar una empresa con vehículos activos');
      }

      const { error } = await supabase
        .from('companies')
        .update({ is_deleted: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Empresa eliminada');
    },
    onError: (error) => {
      toast.error('Error al eliminar empresa', { description: error.message });
    },
  });

  // Financial Category Mutations
  const addFinancialCategoryMutation = useMutation({
    mutationFn: async (data: Partial<DomainFinancialCategory>) => {
      const { data: result, error } = await supabase
        .from('financial_categories')
        .insert(toSbFinancialCategory(data) as any)
        .select()
        .single();
      if (error) throw error;
      return toDomainFinancialCategory(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial_categories'] });
      toast.success('Categoría agregada');
    },
    onError: (error) => {
      toast.error('Error al agregar categoría', { description: error.message });
    },
  });

  const updateFinancialCategoryMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<DomainFinancialCategory> & { id: string }) => {
      const { error } = await supabase
        .from('financial_categories')
        .update(toSbFinancialCategory(data) as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial_categories'] });
      toast.success('Categoría actualizada');
    },
    onError: (error) => {
      toast.error('Error al actualizar categoría', { description: error.message });
    },
  });

  const deleteFinancialCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('financial_categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial_categories'] });
      toast.success('Categoría eliminada');
    },
    onError: (error) => {
      toast.error('Error al eliminar categoría', { description: error.message });
    },
  });

  // Financial Record Mutations
  const addFinancialRecordMutation = useMutation({
    mutationFn: async (data: Partial<DomainFinancialRecord>) => {
      // Financial writes must go through the PostgreSQL RPC gateway.
      // The browser must never be the authority for company_id, created_by,
      // accounting relations, or other sensitive financial fields.
      const result = await createFinancialRecord(toSbFinancialRecord(data) as any);
      return toDomainFinancialRecord(result as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial_records'] });
      toast.success('Registro agregado');
    },
    onError: (error) => {
      toast.error('Error al agregar registro', { description: error.message });
    },
  });

  const updateFinancialRecordMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<DomainFinancialRecord> & { id: string }) => {
      // Only metadata is mutable through this gateway. PostgreSQL rejects
      // accounting/tenant fields even if an attacker edits the request.
      await updateFinancialRecordMetadata(id, toSbFinancialRecord(data) as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial_records'] });
      toast.success('Registro actualizado');
    },
    onError: (error) => {
      toast.error('Error al actualizar registro', { description: error.message });
    },
  });

  // Credit Mutations
  const addCreditMutation = useMutation({
    mutationFn: async (data: Partial<DomainCredit>) => {
      // Credit creation is authoritative in PostgreSQL. This prevents direct
      // browser manipulation of tenant, balance, schedule and vehicle-lock data.
      const result = await createCreditAtomic(toSbCredit(data) as any);
      return toDomainCredit(result as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credits'] });
      toast.success('Crédito agregado');
    },
    onError: (error) => {
      toast.error('Error al agregar crédito', { description: error.message });
    },
  });

  const updateCreditMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<DomainCredit> & { id: string }) => {
      const { error } = await supabase
        .from('credits')
        .update(toSbCredit(data) as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credits'] });
      toast.success('Crédito actualizado');
    },
    onError: (error) => {
      toast.error('Error al actualizar crédito', { description: error.message });
    },
  });

  const deleteCreditMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('credits')
        .update({ is_deleted: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credits'] });
      toast.success('Crédito eliminado');
    },
    onError: (error) => {
      toast.error('Error al eliminar crédito', { description: error.message });
    },
  });

  // Mileage Log Mutations
  const addMileageLogMutation = useMutation({
    mutationFn: async (data: Partial<DomainMileageLog>) => {
      const { data: result, error } = await supabase
        .from('mileage_logs')
        .insert(toSbMileageLog(data) as any)
        .select()
        .single();
      if (error) throw error;
      return toDomainMileageLog(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mileage_logs'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Registro de kilometraje agregado');
    },
    onError: (error) => {
      toast.error('Error al agregar registro', { description: error.message });
    },
  });

  const updateMileageLogMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<DomainMileageLog> & { id: string }) => {
      const { error } = await supabase
        .from('mileage_logs')
        .update(toSbMileageLog(data) as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mileage_logs'] });
      toast.success('Registro actualizado');
    },
    onError: (error) => {
      toast.error('Error al actualizar registro', { description: error.message });
    },
  });

  const deleteMileageLogMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mileage_logs')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mileage_logs'] });
      toast.success('Registro eliminado');
    },
    onError: (error) => {
      toast.error('Error al eliminar registro', { description: error.message });
    },
  });

  // Notification Mutation
  const markNotificationAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      logger.error('Error marking notification as read', error);
    },
  });

  // Message Template Mutations
  const addMessageTemplateMutation = useMutation({
    mutationFn: async (data: Partial<DomainMessageTemplate>) => {
      const { data: result, error } = await supabase
        .from('message_templates')
        .insert({ ...toSbMessageTemplate(data), updated_at: new Date().toISOString() } as any)
        .select()
        .single();
      if (error) throw error;
      return toDomainMessageTemplate(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message_templates'] });
    },
  });

  const updateMessageTemplateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<DomainMessageTemplate> & { id: string }) => {
      const { error } = await supabase
        .from('message_templates')
        .update({ ...toSbMessageTemplate(data), updated_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message_templates'] });
    },
  });

  const deleteMessageTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('message_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message_templates'] });
    },
  });

  // =====================================================
  // COMPLEX OPERATIONS
  // =====================================================

  const addExpense = useCallback(async (data: Partial<DomainFinancialRecord>) => {
    const category = allFinancialCategories.find(c => c.id === data.categoryId);
    const isMaintenance = category?.name === MAINTENANCE_CATEGORY;

    const recordData = {
      ...data,
      type: 'expense' as const,
      createdAt: new Date().toISOString(),
    };

    await addFinancialRecordMutation.mutateAsync(recordData);

    if (data.mileageAtExpense && data.vehicleId) {
      await addMileageLogMutation.mutateAsync({
        vehicleId: data.vehicleId,
        mileage: data.mileageAtExpense,
        date: data.date,
        source: 'expense',
        kind: isMaintenance ? 'maintenance' : 'odometer',
        financialRecordId: data.id,
        notes: data.description,
        companyId: data.companyId,
        isDeleted: false,
      });

      const { error } = await supabase
        .from('vehicles')
        .update({
          current_mileage: data.mileageAtExpense,
          ...(isMaintenance && { last_maintenance_mileage: data.mileageAtExpense }),
        })
        .eq('id', data.vehicleId);

      if (error) throw error;
    }
  }, [allFinancialCategories, addFinancialRecordMutation, addMileageLogMutation]);

  const addIncome = useCallback(async (data: Partial<DomainFinancialRecord>) => {
    const recordData = {
      ...data,
      type: 'income' as const,
      createdAt: new Date().toISOString(),
    };

    await addFinancialRecordMutation.mutateAsync(recordData as any);
  }, [addFinancialRecordMutation]);

  const addPayment = useCallback(async (data: Partial<DomainFinancialRecord>) => {
    const recordData = {
      ...data,
      type: 'payment' as const,
      category: CLIENT_PAYMENT_CATEGORY,
      createdAt: new Date().toISOString(),
    };

    await addFinancialRecordMutation.mutateAsync(recordData as any);
  }, [addFinancialRecordMutation]);

  const createCreditWithFinancialRecord = useCallback(async (
    creditData: Partial<DomainCredit>,
    companyId: string,
  ): Promise<string | null> => {
    if (!currentUser?.uid) throw new Error('Usuario no autenticado');

    try {
      // One PostgreSQL transaction owns the credit, schedule, financial record,
      // client state, vehicle lock and audit log. The supplied companyId is
      // still checked server-side and cannot override the authenticated tenant.
      const result = await createCreditAtomic({
        ...toSbCredit(creditData),
        companyId,
      });

      const creditId = (result as any)?.id;
      if (!creditId) {
        throw new Error('La creación del crédito no devolvió un ID válido');
      }

      await refreshData();
      return creditId;
    } catch (error) {
      logger.error('Error creating credit:', error);
      throw error;
    }
  }, [currentUser, refreshData]);

  const processCreditPayment = useCallback(async (
    creditId: string,
    clientId: string,
    amount: number,
    paymentMethod?: string,
    description?: string,
    companyId?: string,
    categoryId?: string,
  ) => {
    try {
      if (!currentUser?.uid) throw new Error('Usuario no autenticado');
      if (!companyId && !currentUser.companyId) {
        throw new Error('Empresa no disponible para procesar el pago');
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error('El monto del pago debe ser mayor que cero');
      }

      // IMPORTANT: credit payment is an accounting transaction and must be
      // atomic. Do not reintroduce client-side UPDATEs to credits,
      // credit_payment_schedules, clients, vehicles or financial_records.
      //
      // The existing project helper targets process_credit_payment_atomic.
      // If the RPC is not deployed in the current database, fail closed.
      const { data, error } = await supabase.rpc('process_credit_payment_atomic', {
        p_company_id: companyId || currentUser.companyId,
        p_credit_id: creditId,
        p_client_id: clientId,
        p_amount: amount,
        p_payment_date: new Date().toISOString().slice(0, 10),
        p_payment_method: paymentMethod || 'transferencia',
        p_reference: description || null,
        p_created_by: null,
      });

      if (error) throw error;

      await refreshData();

      // Preserve the historical context contract as far as the RPC response
      // allows. The database is the authoritative source of the result.
      const result = (data || {}) as any;
      return {
        success: result.success !== false,
        newCreditBalance: Number(
          result.newCreditBalance ??
          result.new_remaining_balance ??
          result.remaining_balance ??
          0
        ),
        creditId: result.creditId ?? result.credit_id ?? creditId,
        paymentScheduleId:
          result.paymentScheduleId ??
          result.payment_schedule_id ??
          null,
        creditCompleted:
          result.creditCompleted ??
          result.credit_completed ??
          result.status === 'completed' ??
          false,
        ...(result.error ? { error: result.error } : {}),
      };
    } catch (error: any) {
      logger.error('Error processing credit payment:', error);
      return {
        success: false,
        error: error?.message || 'No fue posible procesar el pago',
        newCreditBalance: 0,
        creditId: null,
        paymentScheduleId: null,
      };
    }
  }, [currentUser, refreshData]);

  const cancelCreditWithAdjustment = useCallback(async (creditId: string, reason?: string) => {
    if (!currentUser?.uid) throw new Error('Usuario no autenticado');

    try {
      const { data: credit } = await supabase
        .from('credits')
        .select('*')
        .eq('id', creditId)
        .single();

      if (!credit) throw new Error('Crédito no encontrado');
      if (credit.status !== 'active') throw new Error('El crédito no está activo');

      const remainingBalance = credit.remaining_balance || 0;

      await supabase
        .from('credits')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', creditId);

      await supabase
        .from('clients')
        .update({
          has_active_credit: false,
          active_credit_id: null,
        })
        .eq('id', credit.client_id);

      if (credit.vehicle_id) {
        // Antes solo limpiaba locked_by_credit/associated_credit_id, sin
        // tocar client_id/status - con el fix de que la creación ahora sí
        // fija client_id+status='rented' (para que el vehículo deje de
        // aparecer disponible para otros clientes), la cancelación tiene
        // que revertir exactamente lo mismo o el vehículo quedaría
        // "casado" con el cliente para siempre pese a estar cancelado.
        await supabase
          .from('vehicles')
          .update(toSbVehicle(buildVehicleCreditUnlockPayload()) as any)
          .eq('id', credit.vehicle_id);
      }

      await supabase
        .from('credit_payment_schedules')
        .update({ status: 'cancelled' })
        .eq('credit_id', creditId)
        .eq('status', 'pending');

      if (remainingBalance > 0) {
        // Antes: categoryId: 'credit-cancellation' (string literal, no es un
        // uuid válido) -> financial_records.category_id es NOT NULL uuid en
        // Postgres, así que esto fallaba en toda cancelación con saldo > 0
        // (que es prácticamente cualquier cancelación real, porque solo se
        // puede cancelar un crédito 'active'). Se reutiliza la categoría de
        // 'Pago de Crédito' (affects=credit_payment) porque una Nota de
        // Crédito por cancelación es, contablemente, un movimiento contra el
        // mismo saldo del crédito.
        const categoryId = await resolveCategoryIdByAffects('credit_payment', 'Pago de Crédito');
        await addFinancialRecordMutation.mutateAsync({
          companyId: credit.company_id,
          clientId: credit.client_id,
          vehicleId: credit.vehicle_id,
          categoryId,
          category: 'Nota de Crédito',
          type: 'payment',
          amount: remainingBalance,
          description: `Nota de Crédito - Cancelación: ${reason || 'Sin motivo'}`,
          date: new Date().toISOString(),
          creditId,
          isDeleted: false,
          createdBy: currentUser.uid,
        });
      }

      await refreshData();
      toast.success('Crédito cancelado exitosamente');
    } catch (error: any) {
      toast.error('Error al cancelar crédito', { description: error.message });
      throw error;
    }
  }, [currentUser, addFinancialRecordMutation, refreshData]);

  // Submódulo de Asignaciones (dentro de Vehículos): vehicle_assignment_logs
  // ya existía y tenía RLS de SELECT/INSERT configurado, pero nada en la
  // app insertaba filas ahí - no había forma de registrar una asignación
  // general (renta) ni de consultar después "quién tenía este vehículo en
  // tal fecha" (uso principal: identificar al responsable de una multa).
  const createVehicleAssignment = useCallback(async (input: NewAssignmentInput) => {
    if (!currentUser?.uid) throw new Error('Usuario no autenticado');
    try {
      const { data: vehicle, error: vehicleError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', input.vehicleId)
        .single();
      if (vehicleError || !vehicle) throw new Error('Vehículo no encontrado');

      const { data: openLogsRaw } = await supabase
        .from('vehicle_assignment_logs')
        .select('*')
        .eq('vehicle_id', input.vehicleId)
        .is('unassigned_at', null);
      const openLogs = (openLogsRaw || []).map(toDomainVehicleAssignmentLog);

      const availability = checkVehicleAssignmentAvailability(
        { lockedByCredit: vehicle.locked_by_credit },
        openLogs,
        input.clientId
      );
      if (!availability.available) throw new Error(availability.error);

      const now = new Date().toISOString();

      // Cerrar cualquier asignación abierta de este mismo vehículo (será
      // del mismo cliente si llegamos hasta aquí, dado el check anterior)
      // antes de abrir la nueva, para que el historial no quede con
      // asignaciones solapadas.
      for (const openLog of openLogs) {
        await supabase
          .from('vehicle_assignment_logs')
          .update({ unassigned_at: now })
          .eq('id', openLog.id);
      }

      const payload = buildAssignmentLogPayload({ ...input, assignedBy: currentUser.uid }, now);
      const { error: insertError } = await supabase
        .from('vehicle_assignment_logs')
        .insert(toSbVehicleAssignmentLog(payload) as any);
      if (insertError) throw insertError;

      await supabase
        .from('vehicles')
        .update({ client_id: input.clientId, status: 'rented', updated_at: now })
        .eq('id', input.vehicleId);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['vehicle_assignment_logs'] }),
        queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
      ]);
      toast.success('Asignación registrada exitosamente');
    } catch (error: any) {
      toast.error('Error al registrar la asignación', { description: error.message });
      throw error;
    }
  }, [currentUser, queryClient]);

  const endVehicleAssignment = useCallback(async (assignmentLogId: string, vehicleId: string) => {
    try {
      const now = new Date().toISOString();
      const { error: updateLogError } = await supabase
        .from('vehicle_assignment_logs')
        .update({ unassigned_at: now })
        .eq('id', assignmentLogId);
      if (updateLogError) throw updateLogError;

      const { data: vehicle } = await supabase
        .from('vehicles')
        .select('locked_by_credit')
        .eq('id', vehicleId)
        .single();

      // Si el vehículo está bloqueado por un crédito activo, ese sistema
      // es dueño de client_id/status - no lo tocamos aquí para no pisar
      // el bloqueo de crédito.
      if (!vehicle?.locked_by_credit) {
        await supabase
          .from('vehicles')
          .update({ client_id: null, status: 'active', updated_at: now })
          .eq('id', vehicleId);
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['vehicle_assignment_logs'] }),
        queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
      ]);
      toast.success('Asignación finalizada');
    } catch (error: any) {
      toast.error('Error al finalizar la asignación', { description: error.message });
      throw error;
    }
  }, [queryClient]);

  // NO destructive path: never hard-delete credits, schedules or financial history.
  // Routes through the same non-destructive cancellation used by the UI.
  const deleteCreditWithCleanup = useCallback(async (creditId: string) => {
    await cancelCreditWithAdjustment(
      creditId,
      'Cancelación de crédito solicitada (cleanup). Se conserva historial y registros financieros.',
    );
  }, [cancelCreditWithAdjustment]);

  const addMulta = useCallback(async (data: Partial<DomainMulta>) => {
    const { data: result, error } = await supabase
      .from('multas')
      .insert(toSbMulta(data) as any)
      .select()
      .single();

    if (error) throw error;

    const multaCategory = allFinancialCategories.find(c => c.name === 'Multa');
    if (multaCategory) {
      await addFinancialRecordMutation.mutateAsync({
        clientId: data.clientId,
        vehicleId: data.vehicleId,
        categoryId: multaCategory.id,
        category: 'Multa',
        type: 'income',
        amount: data.total,
        description: `Multa: ${data.descripcion}${data.folio ? ` (Folio: ${data.folio})` : ''}`,
        date: data.fechaInfraccion,
        multaId: result.id,
        isPending: true,
        isDeleted: false,
        companyId: data.companyId,
        createdBy: data.createdBy,
      });
    }

    await refreshData();
    return toDomainMulta(result);
  }, [allFinancialCategories, addFinancialRecordMutation, refreshData]);

  const processMultaPayment = useCallback(async (multaId: string, paymentData: Partial<DomainFinancialRecord>) => {
    const { error: multaError } = await supabase
      .from('multas')
      .update({
        status: 'pagada',
        fecha_pago: paymentData.date,
        updated_at: new Date().toISOString(),
      })
      .eq('id', multaId);

    if (multaError) throw multaError;

    await addFinancialRecordMutation.mutateAsync({
      ...paymentData,
      type: 'payment',
      category: 'Pago de Multa',
      multaId,
      isDeleted: false,
    });

    await refreshData();
  }, [addFinancialRecordMutation, refreshData]);

  // =====================================================
  // CONTEXT VALUE
  // =====================================================

  const contextValue: DataContextType = {
    vehicles,
    rawVehicles: allVehicles,
    allVehicles,
    allClients,
    clients: allClients,
    allClientsBase: allClients,
    partners: allPartners,
    credits: allCredits,
    financialRecords: allFinancialRecords,
    notifications: allNotifications,
    mileageLogs: allMileageLogs,
    users: [],
    vehicleAssignmentLogs: allVehicleAssignmentLogs,
    companies: rawCompanies,
    rawCompanies,
    financialCategories: allFinancialCategories,
    messageTemplates: allMessageTemplates,
    messageLogs: [],
    creditPaymentSchedules: allCreditPaymentSchedules,
    multas: allMultas,
    loadingData,
    selectedCompanyId,
    setSelectedCompanyId,
    clientBalances,
    partnerBalances,
    vehicleMetrics,
    clientMetrics,

    addVehicle: (data) => addVehicleMutation.mutateAsync(data),
    updateVehicle: (id, data) => updateVehicleMutation.mutateAsync({ ...data, id }),
    deleteVehicle: (id) => deleteVehicleMutation.mutateAsync(id),

    addClient: (data) => addClientMutation.mutateAsync(data),
    updateClient: (id, data) => updateClientMutation.mutateAsync({ ...data, id }),
    deleteClient: (id) => deleteClientMutation.mutateAsync(id),

    addPartner: (data) => addPartnerMutation.mutateAsync(data),
    updatePartner: (id, data) => updatePartnerMutation.mutateAsync({ ...data, id }),
    deletePartner: (id) => deletePartnerMutation.mutateAsync(id),

    addCompany: (data) => addCompanyMutation.mutateAsync(data),
    updateCompany: (id, data) => updateCompanyMutation.mutateAsync({ ...data, id }),
    deleteCompany: (id) => deleteCompanyMutation.mutateAsync(id),

    addFinancialCategory: (data) => addFinancialCategoryMutation.mutateAsync(data),
    updateFinancialCategory: (id, data) => updateFinancialCategoryMutation.mutateAsync({ ...data, id }),
    deleteFinancialCategory: (id) => deleteFinancialCategoryMutation.mutateAsync(id),

    addFinancialRecord: (data) => addFinancialRecordMutation.mutateAsync(data),
    updateFinancialRecord: (id, data) => updateFinancialRecordMutation.mutateAsync({ ...data, id }),
    deleteFinancialRecord: async (id, onSuccess) => {
      // Soft-delete remains a direct table mutation until its dedicated
      // PostgreSQL RPC is deployed. Do not revoke financial_records UPDATE
      // yet; doing so before that migration would break this operation.
      const { error } = await supabase
        .from('financial_records')
        .update({ is_deleted: true })
        .eq('id', id);
      if (error) throw error;
      await refreshData();
      if (onSuccess) onSuccess();
    },

    addExpense,
    updateExpense: (id, data) => updateFinancialRecordMutation.mutateAsync({ ...data, id }),
    addIncome,
    updateIncome: (id, data) => updateFinancialRecordMutation.mutateAsync({ ...data, id }),
    addPayment,
    updatePayment: (id, data) => updateFinancialRecordMutation.mutateAsync({ ...data, id }),

    addCredit: (data) => addCreditMutation.mutateAsync(data),
    updateCredit: (id, data) => updateCreditMutation.mutateAsync({ ...data, id }),
    deleteCredit: (id) => deleteCreditMutation.mutateAsync(id),
    deactivateCredit: async (id) => {
      const { data: credit, error: creditError } = await supabase
        .from('credits')
        .select('id, vehicle_id, client_id')
        .eq('id', id)
        .single();
      if (creditError) throw creditError;
      if (!credit) throw new Error('Crédito no encontrado');

      const { error: creditUpdateError } = await supabase
        .from('credits')
        .update({ status: 'inactive' })
        .eq('id', credit.id);
      if (creditUpdateError) throw creditUpdateError;

      if (credit.vehicle_id) {
        const { error: vehicleError } = await supabase
          .from('vehicles')
          .update({ status: 'active', client_id: null })
          .eq('id', credit.vehicle_id);
        if (vehicleError) throw vehicleError;
      }

      await refreshData();
    },
    createCreditWithFinancialRecord,
    processCreditPayment,
    cancelCredit: cancelCreditWithAdjustment,
    cancelCreditWithAdjustment,
    deleteCreditWithCleanup,
    createVehicleAssignment,
    endVehicleAssignment,

    addMileageLog: async (data) => {
      await addMileageLogMutation.mutateAsync(data as any);
    },
    updateMileageLog: (id, data) => updateMileageLogMutation.mutateAsync({ ...data, id }),
    deleteMileageLog: (id) => deleteMileageLogMutation.mutateAsync(id),

    markNotificationAsRead: (id) => markNotificationAsReadMutation.mutateAsync(id),

    addMessageTemplate: (data) => addMessageTemplateMutation.mutateAsync(data),
    updateMessageTemplate: (id, data) => updateMessageTemplateMutation.mutateAsync({ ...data, id }),
    deleteMessageTemplate: (id) => deleteMessageTemplateMutation.mutateAsync(id),
    sendInternalMessage: async () => {
      toast.info('Función no implementada');
    },

    addMulta,
    updateMulta: async (id, data) => {
      const { error } = await supabase.from('multas').update(toSbMulta(data) as any).eq('id', id);
      if (error) throw error;
      await refreshData();
    },
    deleteMulta: async (id) => {
      const { error } = await supabase.from('multas').update({ is_deleted: true }).eq('id', id);
      if (error) throw error;
      await refreshData();
    },
    processMultaPayment,

    getVehicleById: (id) => vehicles.find(v => v.id === id),
    getVehicleWithDetailsById: (id) => vehicles.find(v => v.id === id),
    refreshData,
    handleCreditUpdate: async () => false,
  };

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
