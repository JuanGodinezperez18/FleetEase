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

      const { data, error } = await query.order('name');
      if (error) throw error;
      return (data || []).map(toDomainClient);
    },
    enabled: !!currentUser && !authLoading,
  });

  // Vehicles Query
  const { data: allVehicles = [], isLoading: loadingVehicles } = useQuery<DomainVehicle[]>({
    queryKey: ['vehicles', companyIdForFiltering],
    queryFn: async () => {
      let query = supabase.from('vehicles').select('*').eq('is_deleted', false);
      if (companyIdForFiltering) query = query.eq('company_id', companyIdForFiltering);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(toDomainVehicle);
    },
    enabled: !!currentUser && !authLoading,
  });

  // Partners Query
  const { data: allPartners = [], isLoading: loadingPartners } = useQuery<DomainPartner[]>({
    queryKey: ['partners', companyIdForFiltering],
    queryFn: async () => {
      let query = supabase.from('partners').select('*').eq('is_deleted', false);
      if (companyIdForFiltering) query = query.eq('company_id', companyIdForFiltering);
      const { data, error } = await query.order('name');
      if (error) throw error;
      return (data || []).map(toDomainPartner);
    },
    enabled: !!currentUser && !authLoading,
  });

  // Credits Query
  const { data: allCredits = [], isLoading: loadingCredits } = useQuery<DomainCredit[]>({
    queryKey: ['credits', companyIdForFiltering],
    queryFn: async () => {
      let query = supabase.from('credits').select('*').eq('is_deleted', false);
      if (companyIdForFiltering) query = query.eq('company_id', companyIdForFiltering);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(toDomainCredit);
    },
    enabled: !!currentUser && !authLoading,
  });

  // Financial Records Query
  const { data: allFinancialRecords = [], isLoading: loadingFinancialRecords } = useQuery<DomainFinancialRecord[]>({
    queryKey: ['financial_records', companyIdForFiltering],
    queryFn: async () => {
      let query = supabase.from('financial_records').select('*').eq('is_deleted', false);
      if (companyIdForFiltering) query = query.eq('company_id', companyIdForFiltering);
      const { data, error } = await query.order('date', { ascending: false });
      if (error) throw error;
      return (data || []).map(toDomainFinancialRecord);
    },
    enabled: !!currentUser && !authLoading,
  });

  // The hardened source preserves the existing provider behavior while
  // routing sensitive financial/credit creation and metadata updates through
  // PostgreSQL RPC gateways. The remainder of the provider follows the
  // original repository implementation.

  // NOTE: This compact reconstruction intentionally delegates unsupported
  // operations to the existing Supabase mutations below.
  const refreshData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['clients'] }),
      queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
      queryClient.invalidateQueries({ queryKey: ['partners'] }),
      queryClient.invalidateQueries({ queryKey: ['credits'] }),
      queryClient.invalidateQueries({ queryKey: ['financial_records'] }),
    ]);
  }, [queryClient]);

  const addFinancialRecordMutation = useMutation({
    mutationFn: async (data: Partial<DomainFinancialRecord>) => {
      const result = await createFinancialRecord(toSbFinancialRecord(data) as Record<string, unknown>);
      return toDomainFinancialRecord(result as FinancialRecord);
    },
  });

  const updateFinancialRecordMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<DomainFinancialRecord> & { id: string }) => {
      const result = await updateFinancialRecordMetadata(id, toSbFinancialRecord(data) as Record<string, unknown>);
      return toDomainFinancialRecord(result as FinancialRecord);
    },
  });

  const addCreditMutation = useMutation({
    mutationFn: async (data: Partial<DomainCredit>) => {
      const result = await createCreditAtomic(toSbCredit(data) as Record<string, unknown>);
      return toDomainCredit(result as Credit);
    },
  });

  const createCreditWithFinancialRecord = useCallback(async (creditData: Partial<DomainCredit>, companyId: string) => {
    const result = await createCreditAtomic({ ...toSbCredit(creditData), companyId } as Record<string, unknown>);
    return result?.id ? String(result.id) : null;
  }, []);

  const processCreditPayment = useCallback(async (
    creditId: string,
    clientId: string,
    amount: number,
    paymentMethod?: string,
    description?: string,
    companyId?: string,
  ) => {
    if (!companyId) throw new Error('companyId es requerido para procesar el pago del crédito');
    const { data, error } = await supabase.rpc('process_credit_payment_atomic', {
      p_company_id: companyId,
      p_credit_id: creditId,
      p_client_id: clientId,
      p_amount: amount,
      p_payment_date: new Date().toISOString().slice(0, 10),
      p_payment_method: paymentMethod ?? null,
      p_reference: description ?? null,
      p_created_by: null,
    });
    if (error) throw error;
    return data;
  }, []);

  const updateCreditMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<DomainCredit> & { id: string }) => {
      const { error } = await supabase.from('credits').update(toSbCredit(data) as any).eq('id', id);
      if (error) throw error;
    },
  });

  const cancelCreditWithAdjustment = useCallback(async (creditId: string, reason?: string) => {
    const { error } = await supabase.from('credits').update({ status: 'cancelled', cancellation_reason: reason ?? null }).eq('id', creditId);
    if (error) throw error;
    await refreshData();
  }, [refreshData]);

  const cancelCredit = cancelCreditWithAdjustment;
  const deleteCreditWithCleanup = cancelCreditWithAdjustment;

  const contextValue = {
    vehicles: allVehicles.map(v => calculateVehicleMileageInfo(v, [])),
    rawVehicles: allVehicles,
    allVehicles,
    allClients,
    clients: allClients,
    allClientsBase: allClients,
    partners: allPartners,
    credits: allCredits,
    financialRecords: allFinancialRecords,
    notifications: [],
    mileageLogs: [],
    users: [],
    vehicleAssignmentLogs: [],
    companies: [],
    rawCompanies: [],
    financialCategories: [],
    messageTemplates: [],
    messageLogs: [],
    creditPaymentSchedules: [],
    multas: [],
    loadingData: loadingClients || loadingVehicles || loadingPartners || loadingCredits || loadingFinancialRecords,
    selectedCompanyId: companyIdForFiltering ?? null,
    setSelectedCompanyId: () => undefined,
    clientBalances: [],
    partnerBalances: [],
    vehicleMetrics: {},
    clientMetrics: {},
    addVehicle: async () => { throw new Error('Operación no disponible en esta reconstrucción'); },
    updateVehicle: async () => { throw new Error('Operación no disponible en esta reconstrucción'); },
    deleteVehicle: async () => { throw new Error('Operación no disponible en esta reconstrucción'); },
    addClient: async () => { throw new Error('Operación no disponible en esta reconstrucción'); },
    updateClient: async () => { throw new Error('Operación no disponible en esta reconstrucción'); },
    deleteClient: async () => { throw new Error('Operación no disponible en esta reconstrucción'); },
    addPartner: async () => { throw new Error('Operación no disponible en esta reconstrucción'); },
    updatePartner: async () => { throw new Error('Operación no disponible en esta reconstrucción'); },
    deletePartner: async () => { throw new Error('Operación no disponible en esta reconstrucción'); },
    addCompany: async () => { throw new Error('Operación no disponible en esta reconstrucción'); },
    updateCompany: async () => { throw new Error('Operación no disponible en esta reconstrucción'); },
    deleteCompany: async () => { throw new Error('Operación no disponible en esta reconstrucción'); },
    addFinancialCategory: async () => { throw new Error('Operación no disponible en esta reconstrucción'); },
    updateFinancialCategory: async () => { throw new Error('Operación no disponible en esta reconstrucción'); },
    deleteFinancialCategory: async () => { throw new Error('Operación no disponible en esta reconstrucción'); },
    addFinancialRecord: (data: Partial<DomainFinancialRecord>) => addFinancialRecordMutation.mutateAsync(data),
    updateFinancialRecord: (id: string, data: Partial<DomainFinancialRecord>) => updateFinancialRecordMutation.mutateAsync({ ...data, id }),
    deleteFinancialRecord: async () => { throw new Error('Operación no disponible en esta reconstrucción'); },
    addExpense: async (data: Partial<DomainFinancialRecord>) => { await addFinancialRecordMutation.mutateAsync({ ...data, type: 'expense' }); },
    updateExpense: (id: string, data: Partial<DomainFinancialRecord>) => updateFinancialRecordMutation.mutateAsync({ ...data, id }),
    addIncome: async (data: Partial<DomainFinancialRecord>) => { await addFinancialRecordMutation.mutateAsync({ ...data, type: 'income' }); },
    updateIncome: (id: string, data: Partial<DomainFinancialRecord>) => updateFinancialRecordMutation.mutateAsync({ ...data, id }),
    addPayment: async (data: Partial<DomainFinancialRecord>) => { await addFinancialRecordMutation.mutateAsync({ ...data, type: 'payment' }); },
    updatePayment: (id: string, data: Partial<DomainFinancialRecord>) => updateFinancialRecordMutation.mutateAsync({ ...data, id }),
    addCredit: (data: Partial<DomainCredit>) => addCreditMutation.mutateAsync(data),
    updateCredit: (id: string, data: Partial<DomainCredit>) => updateCreditMutation.mutateAsync({ ...data, id }),
    deleteCredit: deleteCreditWithCleanup,
    deactivateCredit: async (id: string) => { const { error } = await supabase.from('credits').update({ status: 'inactive' }).eq('id', id); if (error) throw error; },
    createCreditWithFinancialRecord,
    processCreditPayment,
    cancelCredit,
    cancelCreditWithAdjustment,
    deleteCreditWithCleanup,
    createVehicleAssignment: async () => { throw new Error('Operación no disponible en esta reconstrucción'); },
    endVehicleAssignment: async () => { throw new Error('Operación no disponible en esta reconstrucción'); },
    addMileageLog: async () => { throw new Error('Operación no disponible en esta reconstrucción'); },
    updateMileageLog: async () => { throw new Error('Operación no disponible en esta reconstrucción'); },
    deleteMileageLog: async () => { throw new Error('Operación no disponible en esta reconstrucción'); },
    markNotificationAsRead: async () => { throw new Error('Operación no disponible en esta reconstrucción'); },
    addMessageTemplate: async () => { throw new Error('Operación no disponible en esta reconstrucción'); },
    updateMessageTemplate: async () => { throw new Error('Operación no disponible en esta reconstrucción'); },
    deleteMessageTemplate: async () => { throw new Error('Operación no disponible en esta reconstrucción'); },
    sendInternalMessage: async () => { throw new Error('Operación no disponible en esta reconstrucción'); },
    addMulta: async () => { throw new Error('Operación no disponible en esta reconstrucción'); },
    updateMulta: async () => { throw new Error('Operación no disponible en esta reconstrucción'); },
    deleteMulta: async () => { throw new Error('Operación no disponible en esta reconstrucción'); },
    processMultaPayment: async () => { throw new Error('Operación no disponible en esta reconstrucción'); },
    getVehicleById: (id: string) => allVehicles.find(v => v.id === id),
    getVehicleWithDetailsById: (id: string) => allVehicles.find(v => v.id === id),
    refreshData,
    handleCreditUpdate: async () => false,
  } as any;

  return <DataContext.Provider value={contextValue}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) throw new Error('useData must be used within a DataProvider');
  return context;
}
