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
import { GlobalLoader } from '@/components/common/GlobalLoader';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { addWeeks } from 'date-fns';
import { logger } from '@/lib/logger';
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

export const CREDIT_GRANTED_CATEGORY = 'Crédito Otorgado';
export const CREDIT_PAYMENT_CATEGORY = 'vKeQhlbdBmZhPw8ZmJEX';
export const CLIENT_PAYMENT_CATEGORY = "Abono de Cliente";
export const DRIVER_PAYMENT_CATEGORY = "Pago a Conductor";
export const MAINTENANCE_CATEGORY = "Mantenimiento";
export const SECURITY_DEPOSIT_CATEGORY = "Depósito de Crédito / Enganche";
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
        setSelectedCompanyIdState(savedCompanyId === 'all' ? null : (savedCompanyId || null));
      } else {
        setSelectedCompanyIdState(currentUser.companyId || null);
      }
    }
  }, [currentUser, authLoading, isSuperAdmin]);

  const companyIdForFiltering = useMemo(() => {
    if (!currentUser) return undefined;
    if (isSuperAdmin) {
      return selectedCompanyId;
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
    enabled: !!currentUser,
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
    enabled: !!currentUser,
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
    enabled: !!currentUser,
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
    enabled: !!currentUser,
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
    enabled: !!currentUser,
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
    enabled: !!currentUser,
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
    enabled: !!currentUser,
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
    enabled: !!currentUser,
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
    enabled: !!currentUser,
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
    enabled: !!currentUser,
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
    enabled: !!currentUser,
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
    enabled: !!currentUser,
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
      const { data: result, error } = await supabase
        .from('financial_records')
        .insert(toSbFinancialRecord(data) as any)
        .select()
        .single();
      if (error) throw error;
      return toDomainFinancialRecord(result);
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
      const { error } = await supabase
        .from('financial_records')
        .update(toSbFinancialRecord(data) as any)
        .eq('id', id);
      if (error) throw error;
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
      const { data: result, error } = await supabase
        .from('credits')
        .insert(toSbCredit(data) as any)
        .select()
        .single();
      if (error) throw error;
      return toDomainCredit(result);
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
      const { data: credit, error: creditError } = await supabase
        .from('credits')
        .insert({
          ...toSbCredit(creditData),
          paid_amount: 0,
          payments_made: 0,
          remaining_balance: creditData.totalAmount,
          status: 'active',
          created_at: new Date().toISOString(),
        } as any)
        .select()
        .single();

      if (creditError) throw creditError;

      const schedules: {
        credit_id: string;
        payment_number: number;
        due_date: string;
        amount: number;
        status: 'pending';
        company_id: string;
      }[] = [];
      for (let i = 0; i < (creditData.numberOfPayments || 0); i++) {
        const dueDate = addWeeks(new Date(creditData.startDate || new Date()), i);
        schedules.push({
          credit_id: credit.id,
          payment_number: i + 1,
          due_date: dueDate.toISOString(),
          amount: creditData.weeklyPayment ?? 0,
          status: 'pending',
          company_id: companyId,
        });
      }

      const { error: scheduleError } = await supabase
        .from('credit_payment_schedules')
        .insert(schedules);

      if (scheduleError) throw scheduleError;

      const { error: clientError } = await supabase
        .from('clients')
        .update({
          has_active_credit: true,
          active_credit_id: credit.id,
        })
        .eq('id', creditData.clientId!);

      if (clientError) throw clientError;

      const creditGrantedCategory = allFinancialCategories.find(
        cat => cat.name === CREDIT_GRANTED_CATEGORY && cat.type === 'income'
      );

      if (creditGrantedCategory) {
        await addFinancialRecordMutation.mutateAsync({
          companyId,
          clientId: creditData.clientId,
          vehicleId: creditData.vehicleId,
          categoryId: creditGrantedCategory.id,
          category: CREDIT_GRANTED_CATEGORY,
          type: 'income',
          amount: creditData.totalAmount,
          paymentMethod: 'credito',
          description: `Crédito otorgado - ${creditData.numberOfPayments} pagos de ${formatCurrency(creditData.weeklyPayment || 0)}`,
          date: creditData.startDate || new Date().toISOString(),
          creditId: credit.id,
          creditGranted: true,
          isDeleted: false,
          createdBy: currentUser.uid,
        });
      }

      await refreshData();
      return credit.id;
    } catch (error) {
      logger.error('Error creating credit:', error);
      throw error;
    }
  }, [currentUser, allFinancialCategories, addFinancialRecordMutation, refreshData]);

  const processCreditPayment = useCallback(async (
    creditId: string,
    clientId: string,
    amount: number,
    paymentMethod?: string,
    description?: string,
    companyId?: string,
    categoryId?: string
  ) => {
    try {
      const { data: credit, error: creditError } = await supabase
        .from('credits')
        .select('*')
        .eq('id', creditId)
        .single();

      if (creditError || !credit) throw new Error('Crédito no encontrado');
      if (credit.status !== 'active') throw new Error('El crédito no está activo');

      const newPaidAmount = credit.paid_amount + amount;
      const newRemainingBalance = Math.max(0, credit.remaining_balance - amount);
      const paymentsMade = (credit.payments_made || 0) + 1;
      const isCompleted = newRemainingBalance <= 0;

      const { error: updateError } = await supabase
        .from('credits')
        .update({
          paid_amount: newPaidAmount,
          remaining_balance: newRemainingBalance,
          payments_made: paymentsMade,
          status: isCompleted ? 'completed' : 'active',
          last_payment_date: new Date().toISOString(),
          last_payment_amount: amount,
        })
        .eq('id', creditId);

      if (updateError) throw updateError;

      const { data: schedules } = await supabase
        .from('credit_payment_schedules')
        .select('*')
        .eq('credit_id', creditId)
        .eq('status', 'pending')
        .order('payment_number', { ascending: true })
        .limit(1);

      if (schedules && schedules.length > 0) {
        await supabase
          .from('credit_payment_schedules')
          .update({
            status: 'paid',
            paid_amount: amount,
            paid_date: new Date().toISOString(),
          })
          .eq('id', schedules[0].id);
      }

      if (isCompleted) {
        await supabase
          .from('clients')
          .update({
            has_active_credit: false,
            active_credit_id: null,
          })
          .eq('id', clientId);
      }

      await addFinancialRecordMutation.mutateAsync({
        companyId: companyId || credit.company_id,
        clientId,
        vehicleId: credit.vehicle_id,
        categoryId: categoryId || CREDIT_PAYMENT_CATEGORY,
        category: 'Pago de Crédito',
        type: 'payment',
        amount,
        paymentMethod: paymentMethod || 'transferencia',
        description: description || `Pago de crédito - Cuota ${paymentsMade}`,
        date: new Date().toISOString(),
        creditId,
        creditPayment: true,
        isDeleted: false,
        createdBy: currentUser?.uid,
      });

      await refreshData();

      return {
        success: true,
        newCreditBalance: newRemainingBalance,
        creditId,
        paymentScheduleId: schedules?.[0]?.id || null,
        creditCompleted: isCompleted,
      };
    } catch (error: any) {
      logger.error('Error processing credit payment:', error);
      return {
        success: false,
        error: error.message,
        newCreditBalance: 0,
        creditId: null,
        paymentScheduleId: null,
      };
    }
  }, [currentUser, addFinancialRecordMutation, refreshData]);

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
        await supabase
          .from('vehicles')
          .update({
            locked_by_credit: false,
            associated_credit_id: null,
          })
          .eq('id', credit.vehicle_id);
      }

      await supabase
        .from('credit_payment_schedules')
        .update({ status: 'cancelled' })
        .eq('credit_id', creditId)
        .eq('status', 'pending');

      if (remainingBalance > 0) {
        await addFinancialRecordMutation.mutateAsync({
          companyId: credit.company_id,
          clientId: credit.client_id,
          vehicleId: credit.vehicle_id,
          categoryId: 'credit-cancellation',
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

  const deleteCreditWithCleanup = useCallback(async (creditId: string) => {
    try {
      await supabase
        .from('financial_records')
        .delete()
        .eq('credit_id', creditId);

      await supabase
        .from('credit_payment_schedules')
        .delete()
        .eq('credit_id', creditId);

      await supabase
        .from('credits')
        .delete()
        .eq('id', creditId);

      await refreshData();
      toast.success('Crédito y registros asociados eliminados');
    } catch (error: any) {
      toast.error('Error al eliminar crédito', { description: error.message });
      throw error;
    }
  }, [refreshData]);

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
      await supabase.from('financial_records').update({ is_deleted: true }).eq('id', id);
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
      await supabase.from('credits').update({ status: 'inactive' }).eq('id', id);
      await supabase.from('vehicles').update({ status: 'active', client_id: null }).eq('id', id);
      await refreshData();
    },
    createCreditWithFinancialRecord,
    processCreditPayment,
    cancelCredit: cancelCreditWithAdjustment,
    cancelCreditWithAdjustment,
    deleteCreditWithCleanup,

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

  if (loadingData) {
    return <GlobalLoader />;
  }

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
