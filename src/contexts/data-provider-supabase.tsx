/**
 * @fileoverview Data Provider con Supabase
 *
 * Provee el modelo de dominio (camelCase) a la UI adaptando las filas
 * snake_case que devuelve Supabase. La UI consume @/types (dominio).
 */

"use client";

import React, { createContext, useState, useEffect, useCallback, useMemo, ReactNode, useContext } from 'react';
import { usePathname } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './auth-provider-supabase';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { buildVehicleCreditUnlockPayload } from '@/lib/credit-creation';
import { createFinancialRecord, updateFinancialRecordMetadata } from '@/lib/financial-rpc';
import { createCreditAtomic } from '@/lib/credit-rpc';
import { buildAssignmentLogPayload, checkVehicleAssignmentAvailability, type NewAssignmentInput } from '@/lib/vehicle-assignment';
import type { Client, Vehicle, Partner, Credit, FinancialRecord, MileageLog, Notification, VehicleAssignmentLog, Company, FinancialCategory, MessageTemplate, MessageLog, CreditPaymentSchedule, Multa } from '@/types/supabase';
import { toDomainClient, toDomainVehicle, toDomainPartner, toDomainCredit, toDomainFinancialRecord, toDomainMileageLog, toDomainNotification, toDomainVehicleAssignmentLog, toDomainCompany, toDomainFinancialCategory, toDomainMessageTemplate, toDomainMessageLog, toDomainCreditPaymentSchedule, toDomainMulta, toSbClient, toSbVehicle, toSbPartner, toSbCredit, toSbFinancialRecord, toSbMileageLog, toSbNotification, toSbVehicleAssignmentLog, toSbCompany, toSbFinancialCategory, toSbMessageTemplate, toSbMessageLog, toSbCreditPaymentSchedule, toSbMulta } from '@/lib/domain-mappers';
import { formatCurrency } from '@/lib/utils';
import { calculatePartnerBalance, calculateClientBalance } from '@/lib/financial-metrics';
import { useVehicleAnalytics } from '@/hooks/use-vehicle-analytics';
import { useClientAnalytics } from '@/hooks/use-client-analytics';
import type { Client as DomainClient, Vehicle as DomainVehicle, Partner as DomainPartner, Credit as DomainCredit, FinancialRecord as DomainFinancialRecord, MileageLog as DomainMileageLog, Notification as DomainNotification, VehicleAssignmentLog as DomainVehicleAssignmentLog, Company as DomainCompany, FinancialCategory as DomainFinancialCategory, MessageTemplate as DomainMessageTemplate, MessageLog as DomainMessageLog, CreditPaymentSchedule as DomainCreditPaymentSchedule, Multa as DomainMulta, VehicleWithMileage as DomainVehicleWithMileage } from '@/types';

export interface DataContextType {
  vehicles: DomainVehicleWithMileage[]; rawVehicles: DomainVehicle[]; allVehicles: DomainVehicle[]; allClients: DomainClient[]; clients: DomainClient[]; allClientsBase: DomainClient[]; partners: DomainPartner[]; credits: DomainCredit[]; financialRecords: DomainFinancialRecord[]; notifications: DomainNotification[]; mileageLogs: DomainMileageLog[]; users: any[]; vehicleAssignmentLogs: DomainVehicleAssignmentLog[]; companies: DomainCompany[]; rawCompanies: DomainCompany[]; financialCategories: DomainFinancialCategory[]; messageTemplates: DomainMessageTemplate[]; messageLogs: DomainMessageLog[]; creditPaymentSchedules: DomainCreditPaymentSchedule[]; multas: DomainMulta[]; loadingData: boolean; selectedCompanyId: string | null; setSelectedCompanyId: (id: string | null) => void; clientBalances: { id: string; balance: number }[]; partnerBalances: { id: string; name: string; balance: number; vehicleCount?: number; email?: string }[]; vehicleMetrics: ReturnType<typeof useVehicleAnalytics>['vehicleMetrics']; clientMetrics: ReturnType<typeof useClientAnalytics>['clientMetrics'];
  addVehicle: (data: Partial<DomainVehicle>) => Promise<DomainVehicle>; updateVehicle: (id: string, data: Partial<DomainVehicle>) => Promise<void>; deleteVehicle: (id: string) => Promise<void>; addClient: (data: Partial<DomainClient>) => Promise<DomainClient>; updateClient: (id: string, data: Partial<DomainClient>) => Promise<void>; deleteClient: (id: string) => Promise<void>; addPartner: (data: Partial<DomainPartner>) => Promise<DomainPartner>; updatePartner: (id: string, data: Partial<DomainPartner>) => Promise<void>; deletePartner: (id: string) => Promise<void>; addCompany: (data: Partial<DomainCompany>) => Promise<DomainCompany>; updateCompany: (id: string, data: Partial<DomainCompany>) => Promise<void>; deleteCompany: (id: string) => Promise<void>; addFinancialCategory: (data: Partial<DomainFinancialCategory>) => Promise<any>; updateFinancialCategory: (id: string, data: Partial<DomainFinancialCategory>) => Promise<void>; deleteFinancialCategory: (id: string) => Promise<void>; addFinancialRecord: (data: Partial<DomainFinancialRecord>) => Promise<DomainFinancialRecord>; updateFinancialRecord: (id: string, data: Partial<DomainFinancialRecord>) => Promise<void>; deleteFinancialRecord: (id: string, onSuccess?: () => void) => Promise<void>; addExpense: (data: Partial<DomainFinancialRecord>) => Promise<void>; updateExpense: (id: string, data: Partial<DomainFinancialRecord>) => Promise<void>; addIncome: (data: Partial<DomainFinancialRecord>) => Promise<void>; updateIncome: (id: string, data: Partial<DomainFinancialRecord>) => Promise<void>; addPayment: (data: Partial<DomainFinancialRecord>) => Promise<void>; updatePayment: (id: string, data: Partial<DomainFinancialRecord>) => Promise<void>; addCredit: (data: Partial<DomainCredit>) => Promise<DomainCredit>; updateCredit: (id: string, data: Partial<DomainCredit>) => Promise<void>; deleteCredit: (id: string) => Promise<void>; deactivateCredit: (id: string) => Promise<void>; createCreditWithFinancialRecord: (creditData: Partial<DomainCredit>, companyId: string) => Promise<string | null>; processCreditPayment: (creditId: string, clientId: string, amount: number, paymentMethod?: string, description?: string, companyId?: string, categoryId?: string) => Promise<any>; cancelCredit: (creditId: string) => Promise<void>; cancelCreditWithAdjustment: (creditId: string, reason?: string) => Promise<void>; deleteCreditWithCleanup: (creditId: string) => Promise<void>; createVehicleAssignment: (input: NewAssignmentInput) => Promise<void>; endVehicleAssignment: (assignmentLogId: string, vehicleId: string) => Promise<void>; addMileageLog: (log: Partial<DomainMileageLog>) => Promise<void>; updateMileageLog: (id: string, log: Partial<DomainMileageLog>) => Promise<void>; deleteMileageLog: (id: string) => Promise<void>; markNotificationAsRead: (id: string) => Promise<void>; addMessageTemplate: (data: Partial<DomainMessageTemplate>) => Promise<DomainMessageTemplate>; updateMessageTemplate: (id: string, data: Partial<DomainMessageTemplate>) => Promise<void>; deleteMessageTemplate: (id: string) => Promise<void>; sendInternalMessage: (userIds: string[], title: string, body: string) => Promise<void>; addMulta: (data: Partial<DomainMulta>) => Promise<DomainMulta>; updateMulta: (id: string, data: Partial<DomainMulta>) => Promise<void>; deleteMulta: (id: string) => Promise<void>; processMultaPayment: (multaId: string, paymentData: Partial<DomainFinancialRecord>) => Promise<void>; getVehicleById: (id: string) => DomainVehicleWithMileage | undefined; getVehicleWithDetailsById: (id: string) => DomainVehicleWithMileage | undefined; refreshData: () => Promise<void>; handleCreditUpdate: (clientId: string, amount: number, isDownPayment?: boolean) => Promise<boolean>;
}

export const DataContext = createContext<DataContextType | undefined>(undefined);

async function resolveCategoryIdByAffects(affects: 'credit_payment' | 'credit_granted' | 'security_deposit' | 'client_balance' | 'partner_balance' | 'driver_payment' | 'none', friendlyName: string): Promise<string> {
  const { data: category, error } = await supabase.from('financial_categories').select('id').eq('affects', affects).limit(1).maybeSingle();
  if (error || !category) throw new Error(`No existe una categoría de "${friendlyName}" configurada (affects=${affects}). Créala en Configuración > Categorías Financieras.`);
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

function getSafeVehicleError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (/^(El color es requerido|El color del vehículo no es válido|Esta placa ya está registrada|Este número de serie ya está registrado|El costo de adquisición no puede ser negativo|La renta por semana no puede ser negativa|El costo de administración no puede ser negativo|El kilometraje no puede ser negativo|El kilometraje del último mantenimiento no puede ser negativo|El último mantenimiento no puede ser mayor que el kilometraje actual)\.?$/i.test(message.trim())) {
    return new Error(message.trim());
  }
  if (/null value in column ["']?color["']?/i.test(message) || (/color/i.test(message) && /required|requerid|not-null/i.test(message))) {
    return new Error('El color es requerido.');
  }
  if (/duplicate|unique/i.test(message) && /plate/i.test(message)) {
    return new Error('Esta placa ya está registrada.');
  }
  if (/duplicate|unique/i.test(message) && /serial/i.test(message)) {
    return new Error('Este número de serie ya está registrado.');
  }
  logger.error('Vehicle mutation failed', error);
  return new Error('No fue posible guardar el vehículo. Revisa los datos e inténtalo nuevamente.');
}

function validateVehicleMutation(data: Partial<DomainVehicle>, existingCurrentMileage?: number, requireInsurance = false): void {
  if (requireInsurance) {
    if (!String(data.insurancePolicyNumber ?? '').trim()) {
      throw new Error('El número de póliza de seguro es requerido.');
    }
    if (!String(data.insuranceExpiryDate ?? '').trim()) {
      throw new Error('La fecha de vencimiento de la póliza de seguro es requerida.');
    }
    if (!String(data.insurancePolicyDocumentUrl ?? '').trim()) {
      throw new Error('El documento de la póliza de seguro es requerido.');
    }
  }

  if (data.color !== undefined && !String(data.color ?? '').trim()) {
    throw new Error('El color es requerido.');
  }

  for (const [value, label] of [
    [data.cost, 'El costo de adquisición'],
    [data.weeklyRentalValue, 'La renta por semana'],
    [data.adminCommission, 'El costo de administración'],
  ] as const) {
    if (value !== undefined && (!Number.isFinite(Number(value)) || Number(value) < 0)) {
      throw new Error(`${label} no puede ser negativo.`);
    }
  }

  if (data.currentMileage !== undefined && (!Number.isFinite(Number(data.currentMileage)) || Number(data.currentMileage) < 0)) {
    throw new Error('El kilometraje no puede ser negativo.');
  }

  if (data.lastMaintenanceMileage !== undefined && (!Number.isFinite(Number(data.lastMaintenanceMileage)) || Number(data.lastMaintenanceMileage) < 0)) {
    throw new Error('El kilometraje del último mantenimiento no puede ser negativo.');
  }

  const currentMileage = data.currentMileage !== undefined ? Number(data.currentMileage) : existingCurrentMileage;
  const lastMaintenanceMileage = data.lastMaintenanceMileage !== undefined ? Number(data.lastMaintenanceMileage) : undefined;
  if (lastMaintenanceMileage !== undefined && currentMileage !== undefined && lastMaintenanceMileage > currentMileage) {
    throw new Error('El último mantenimiento no puede ser mayor que el kilometraje actual.');
  }
}

function calculateVehicleMileageInfo(vehicle: DomainVehicle, logs: DomainMileageLog[], companyMaintenanceInterval?: number): DomainVehicleWithMileage {
  const vehicleLogs = logs.filter(log => log.vehicleId === vehicle.id && !log.isDeleted).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const currentMileage = vehicle.currentMileage || 0;
  const lastMaintenanceMileage = vehicle.lastMaintenanceMileage || 0;
  // The company configuration is the source of truth. The vehicle value is only
  // a legacy fallback when a valid company setting is not available.
  const configuredCompanyInterval = Number(companyMaintenanceInterval);
  const configuredVehicleInterval = Number(vehicle.maintenanceInterval);
  const maintenanceInterval =
    Number.isFinite(configuredCompanyInterval) && configuredCompanyInterval > 0
      ? configuredCompanyInterval
      : Number.isFinite(configuredVehicleInterval) && configuredVehicleInterval > 0
        ? configuredVehicleInterval
        : 10000;
  const kmToNextMaintenance = maintenanceInterval - (currentMileage - lastMaintenanceMileage);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentLogs = vehicleLogs.filter(log => new Date(log.date) >= thirtyDaysAgo);
  const dailyAveragekm = recentLogs.length > 1 ? (recentLogs[0].mileage - recentLogs[recentLogs.length - 1].mileage) / 30 : 0;
  return { ...vehicle, displayCurrentMileage: currentMileage.toLocaleString(), displayLastMaintMileage: lastMaintenanceMileage.toLocaleString(), displayNextMaintDueAt: (currentMileage + kmToNextMaintenance).toLocaleString(), displayKmToNextMaintenance: kmToNextMaintenance.toLocaleString(), kmToNextMaintenance, dailyAveragekm };
}


export function DataProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { currentUser, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const isDashboardRoot = pathname === '/dashboard' || pathname === '/dashboard/';
  const needsMessageTemplates = pathname.startsWith('/dashboard/messages');
  const needsCreditSchedules = isDashboardRoot || pathname.startsWith('/dashboard/credits') || pathname.startsWith('/dashboard/finanzas') || pathname.startsWith('/client/payments');
  const needsMileageLogs = isDashboardRoot || pathname.includes('/mileage') || pathname.includes('/vehicles') || pathname.includes('/vehicle');
  const needsAssignmentLogs = isDashboardRoot || pathname.includes('/assignments') || pathname.includes('/vehicles/') || pathname.includes('/vehicle') || pathname.includes('/multas') || pathname.startsWith('/dashboard/finanzas/income');
  const [selectedCompanyId, setSelectedCompanyIdState] = useState<string | null>(null);
  const isSuperAdmin = currentUser?.role === 'superAdmin';
  const setSelectedCompanyId = useCallback((companyId: string | null) => { setSelectedCompanyIdState(companyId); if (typeof window !== 'undefined') { if (companyId) localStorage.setItem('selectedCompanyId', companyId); else localStorage.removeItem('selectedCompanyId'); } }, []);
  useEffect(() => { if (!authLoading && currentUser) { if (isSuperAdmin) { const savedCompanyId = localStorage.getItem('selectedCompanyId'); if (savedCompanyId === 'all') setSelectedCompanyIdState(null); else if (savedCompanyId) setSelectedCompanyIdState(savedCompanyId); else if (currentUser.companyId) setSelectedCompanyIdState(currentUser.companyId); else setSelectedCompanyIdState(null); } else setSelectedCompanyIdState(currentUser.companyId || null); } }, [currentUser, authLoading, isSuperAdmin]);
  const companyIdForFiltering = useMemo(() => { if (!currentUser) return undefined; if (isSuperAdmin) return selectedCompanyId || currentUser.companyId || null; return currentUser.companyId; }, [currentUser, isSuperAdmin, selectedCompanyId]);

  const { data: allClients = [], isLoading: loadingClients } = useQuery<DomainClient[]>({ queryKey: ['clients', companyIdForFiltering], queryFn: async () => { let query = supabase.from('clients').select('*').eq('is_deleted', false); if (companyIdForFiltering) query = query.eq('company_id', companyIdForFiltering); const { data, error } = await query.limit(2000); if (error) throw error; return (data || []).map(toDomainClient); }, enabled: !!currentUser && (!isSuperAdmin || !!companyIdForFiltering), staleTime: 2 * 60 * 1000 });
  const { data: allVehicles = [], isLoading: loadingVehicles } = useQuery<DomainVehicle[]>({ queryKey: ['vehicles', companyIdForFiltering], queryFn: async () => { let query = supabase.from('vehicles').select('*').eq('is_deleted', false); if (companyIdForFiltering) query = query.eq('company_id', companyIdForFiltering); const { data, error } = await query.limit(2000); if (error) throw error; return (data || []).map(toDomainVehicle); }, enabled: !!currentUser && (!isSuperAdmin || !!companyIdForFiltering), staleTime: 2 * 60 * 1000 });
  const { data: allPartners = [], isLoading: loadingPartners } = useQuery<DomainPartner[]>({ queryKey: ['partners', companyIdForFiltering], queryFn: async () => { let query = supabase.from('partners').select('*').eq('is_deleted', false); if (companyIdForFiltering) query = query.eq('company_id', companyIdForFiltering); const { data, error } = await query.limit(1000); if (error) throw error; return (data || []).map(toDomainPartner); }, enabled: !!currentUser && (!isSuperAdmin || !!companyIdForFiltering), staleTime: 10 * 60 * 1000 });
  const { data: allCredits = [], isLoading: loadingCredits } = useQuery<DomainCredit[]>({ queryKey: ['credits', companyIdForFiltering], queryFn: async () => { let query = supabase.from('credits').select('*').eq('is_deleted', false); if (companyIdForFiltering) query = query.eq('company_id', companyIdForFiltering); const { data, error } = await query.limit(1500); if (error) throw error; return (data || []).map(toDomainCredit); }, enabled: !!currentUser && (!isSuperAdmin || !!companyIdForFiltering), staleTime: 10 * 60 * 1000 });
  const { data: allFinancialRecords = [], isLoading: loadingFinancialRecords } = useQuery<DomainFinancialRecord[]>({ queryKey: ['financial_records', companyIdForFiltering], queryFn: async () => { let query = supabase.from('financial_records').select('*').eq('is_deleted', false).order('date', { ascending: false }); if (companyIdForFiltering) query = query.eq('company_id', companyIdForFiltering); const { data, error } = await query.limit(5000); if (error) throw error; return (data || []).map(toDomainFinancialRecord); }, enabled: !!currentUser && (!isSuperAdmin || !!companyIdForFiltering), staleTime: 2 * 60 * 1000 });
  const { data: allMileageLogs = [], isLoading: loadingMileageLogs } = useQuery<DomainMileageLog[]>({ queryKey: ['mileage_logs', companyIdForFiltering], queryFn: async () => { let query = supabase.from('mileage_logs').select('*').eq('is_deleted', false).order('date', { ascending: false }); if (companyIdForFiltering) query = query.eq('company_id', companyIdForFiltering); const { data, error } = await query.limit(5000); if (error) throw error; return (data || []).map(toDomainMileageLog); }, enabled: !!currentUser && (!isSuperAdmin || !!companyIdForFiltering) && needsMileageLogs, staleTime: 15 * 60 * 1000 });
  const { data: allCompanies = [], isLoading: loadingCompanies } = useQuery<DomainCompany[]>({
    queryKey: ['companies', isSuperAdmin ? 'all' : currentUser?.companyId],
    queryFn: async () => {
      let query = supabase.from('companies').select('*').eq('is_deleted', false);
      if (!isSuperAdmin && currentUser?.companyId) query = query.eq('id', currentUser.companyId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(toDomainCompany);
    },
    enabled: !!currentUser && (isSuperAdmin || !!currentUser.companyId),
    staleTime: 2 * 60 * 1000,
  });
  const { data: allFinancialCategories = [], isLoading: loadingCategories } = useQuery<DomainFinancialCategory[]>({ queryKey: ['financial_categories', companyIdForFiltering], queryFn: async () => { let query = supabase.from('financial_categories').select('*'); if (companyIdForFiltering) query = query.or(`company_id.eq.${companyIdForFiltering},company_id.is.null`); const { data, error } = await query; if (error) throw error; const categoryMap = new Map<string, DomainFinancialCategory>(); (data || []).forEach(cat => { const domainCat = toDomainFinancialCategory(cat); if (!categoryMap.has(domainCat.id)) categoryMap.set(domainCat.id, domainCat); }); return Array.from(categoryMap.values()); }, enabled: !!currentUser && (!isSuperAdmin || !!companyIdForFiltering) });
  const { data: allNotifications = [] } = useQuery<DomainNotification[]>({ queryKey: ['notifications', currentUser?.uid, companyIdForFiltering], queryFn: async () => { let query = supabase.from('notifications').select('*').eq('uid', currentUser!.uid); if (companyIdForFiltering) query = query.eq('company_id', companyIdForFiltering); const { data, error } = await query.order('date', { ascending: false }).limit(100); if (error) throw error; return (data || []).map(toDomainNotification); }, enabled: !!currentUser && (!isSuperAdmin || !!companyIdForFiltering), staleTime: 60 * 1000 });
  const { data: allMessageTemplates = [] } = useQuery<DomainMessageTemplate[]>({ queryKey: ['message_templates', companyIdForFiltering], queryFn: async () => { let query = supabase.from('message_templates').select('*').eq('is_deleted', false); if (companyIdForFiltering) query = query.eq('company_id', companyIdForFiltering); const { data, error } = await query.limit(1000); if (error) throw error; return (data || []).map(toDomainMessageTemplate); }, enabled: !!currentUser && (!isSuperAdmin || !!companyIdForFiltering) && needsMessageTemplates, staleTime: 5 * 60 * 1000 });
  const { data: allCreditPaymentSchedules = [] } = useQuery<DomainCreditPaymentSchedule[]>({ queryKey: ['credit_payment_schedules', companyIdForFiltering], queryFn: async () => { let query = supabase.from('credit_payment_schedules').select('*'); if (companyIdForFiltering) query = query.eq('company_id', companyIdForFiltering); const { data, error } = await query; if (error) throw error; return (data || []).map(toDomainCreditPaymentSchedule); }, enabled: !!currentUser && (!isSuperAdmin || !!companyIdForFiltering) && needsCreditSchedules, staleTime: 5 * 60 * 1000 });
  const { data: allMultas = [] } = useQuery<DomainMulta[]>({ queryKey: ['multas', companyIdForFiltering], queryFn: async () => { let query = supabase.from('multas').select('*').eq('is_deleted', false); if (companyIdForFiltering) query = query.eq('company_id', companyIdForFiltering); const { data, error } = await query.limit(1000); if (error) throw error; return (data || []).map(toDomainMulta); }, enabled: !!currentUser && (!isSuperAdmin || !!companyIdForFiltering) && (isDashboardRoot || pathname.includes('/multas')), staleTime: 5 * 60 * 1000 });
  const { data: allVehicleAssignmentLogs = [] } = useQuery<DomainVehicleAssignmentLog[]>({ queryKey: ['vehicle_assignment_logs', companyIdForFiltering], queryFn: async () => { let query = supabase.from('vehicle_assignment_logs').select('*'); if (companyIdForFiltering) query = query.eq('company_id', companyIdForFiltering); const { data, error } = await query; if (error) throw error; return (data || []).map(toDomainVehicleAssignmentLog); }, enabled: !!currentUser && (!isSuperAdmin || !!companyIdForFiltering) && needsAssignmentLogs, staleTime: 5 * 60 * 1000 });

  const vehicles = useMemo(() => {
    const companyIntervals = new Map(
      allCompanies
        .filter(company => company.id)
        .map(company => [company.id, Number(company.maintenanceInterval)] as const)
    );

    return allVehicles.map(vehicle =>
      calculateVehicleMileageInfo(
        vehicle,
        allMileageLogs,
        companyIntervals.get(vehicle.companyId)
      )
    );
  }, [allVehicles, allMileageLogs, allCompanies]);
  const { vehicleMetrics } = useVehicleAnalytics(allVehicles, allFinancialRecords, allVehicleAssignmentLogs);
  const { clientMetrics } = useClientAnalytics(allClients, allFinancialRecords, vehicles);

  // Indexamos los movimientos una sola vez. Las funciones financieras canónicas
  // siguen siendo la fuente de verdad de las fórmulas; solo evitamos repetir el
  // recorrido completo de financial_records por cada cliente.
  const clientBalances = useMemo(() => {
    const recordsByClient = new Map<string, DomainFinancialRecord[]>();
    for (const record of allFinancialRecords) {
      if (record.isDeleted || !record.clientId) continue;
      const bucket = recordsByClient.get(record.clientId);
      if (bucket) bucket.push(record);
      else recordsByClient.set(record.clientId, [record]);
    }

    return allClients
      .filter(client => !client.isDeleted)
      .map(client => ({
        id: client.id,
        balance: calculateClientBalance(client, recordsByClient.get(client.id) || []).balance,
      }));
  }, [allClients, allFinancialRecords]);

  // Un vehículo puede tener historial con más de un socio. Esto replica la
  // semántica de getPartnerFinancialRecords sin hacer un filter() completo por
  // socio y preserva movimientos históricos incluso después de vender el vehículo.
  const partnerBalances = useMemo(() => {
    if (!allPartners?.length) return [];

    const vehiclePartnerIds = new Map<string, Set<string>>();
    const addVehiclePartner = (vehicleId: string, partnerId: string) => {
      const partnersForVehicle = vehiclePartnerIds.get(vehicleId);
      if (partnersForVehicle) partnersForVehicle.add(partnerId);
      else vehiclePartnerIds.set(vehicleId, new Set([partnerId]));
    };

    for (const vehicle of allVehicles) {
      if (!vehicle.isDeleted && vehicle.partnerId) addVehiclePartner(vehicle.id, vehicle.partnerId);
    }

    // También reconstruimos las relaciones históricas que usa el cálculo
    // canónico cuando un vehículo ya no pertenece al socio actual.
    for (const record of allFinancialRecords) {
      if (record.isDeleted || !record.vehicleId || !record.partnerId) continue;
      addVehiclePartner(record.vehicleId, record.partnerId);
    }

    const recordsByPartner = new Map<string, DomainFinancialRecord[]>();
    const appendRecord = (partnerId: string, record: DomainFinancialRecord) => {
      const bucket = recordsByPartner.get(partnerId);
      if (bucket) bucket.push(record);
      else recordsByPartner.set(partnerId, [record]);
    };

    for (const record of allFinancialRecords) {
      if (record.isDeleted) continue;
      const partnerIds = new Set<string>();
      if (record.partnerId) partnerIds.add(record.partnerId);
      if (record.vehicleId) {
        for (const partnerId of vehiclePartnerIds.get(record.vehicleId) || []) partnerIds.add(partnerId);
      }
      for (const partnerId of partnerIds) appendRecord(partnerId, record);
    }

    const vehicleCountByPartner = new Map<string, number>();
    for (const vehicle of allVehicles) {
      if (!vehicle.isDeleted && vehicle.partnerId) {
        vehicleCountByPartner.set(vehicle.partnerId, (vehicleCountByPartner.get(vehicle.partnerId) || 0) + 1);
      }
    }

    return allPartners
      .filter(partner => !partner.isDeleted)
      .map(partner => {
        const balance = calculatePartnerBalance(partner, [], recordsByPartner.get(partner.id) || []);
        const firstName = partner.firstname || '';
        const lastName = partner.lastname || '';
        const fullName = `${firstName} ${lastName}`.trim();
        const displayName = fullName || partner.email || 'Socio sin nombre';
        return {
          id: partner.id,
          name: displayName,
          balance,
          vehicleCount: vehicleCountByPartner.get(partner.id) || 0,
          email: partner.email || undefined,
        };
      });
  }, [allPartners, allVehicles, allFinancialRecords]);
  const rawCompanies = useMemo(() => isSuperAdmin ? allCompanies : allCompanies.filter(c => c.id === currentUser?.companyId), [allCompanies, isSuperAdmin, currentUser]);
  const loadingData = useMemo(() => authLoading || loadingClients || loadingVehicles || loadingFinancialRecords || loadingCategories, [authLoading, loadingClients, loadingVehicles, loadingFinancialRecords, loadingCategories]);
  const refreshData = useCallback(async () => { await queryClient.invalidateQueries(); }, [queryClient]);

  const addVehicleMutation = useMutation({
    mutationFn: async (data: Partial<DomainVehicle>) => {
      try {
        validateVehicleMutation(data, undefined, true);
        const { data: result, error } = await supabase.from('vehicles').insert(toSbVehicle(data) as any).select().single();
        if (error) throw error;
        return toDomainVehicle(result);
      } catch (error) {
        throw getSafeVehicleError(error);
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vehicles'] }); toast.success('Vehículo agregado exitosamente'); },
    onError: (error) => toast.error('Error al agregar vehículo', { description: error.message }),
  });
  const updateVehicleMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<DomainVehicle> & { id: string }) => {
      try {
        const { data: existing, error: fetchError } = await supabase
          .from('vehicles')
          .select('current_mileage, insurance_policy_number, insurance_expiry_date, insurance_policy_document_url')
          .eq('id', id)
          .single();
        if (fetchError) throw fetchError;

        const mergedForValidation: Partial<DomainVehicle> = {
          currentMileage: Number(existing.current_mileage ?? 0),
          insurancePolicyNumber: existing.insurance_policy_number,
          insuranceExpiryDate: existing.insurance_expiry_date,
          insurancePolicyDocumentUrl: existing.insurance_policy_document_url,
          ...data,
        };

        validateVehicleMutation(mergedForValidation, Number(existing.current_mileage ?? 0), true);
        const { error } = await supabase.from('vehicles').update(toSbVehicle(data) as any).eq('id', id);
        if (error) throw error;
      } catch (error) {
        throw getSafeVehicleError(error);
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vehicles'] }); toast.success('Vehículo actualizado'); },
    onError: (error) => toast.error('Error al actualizar vehículo', { description: error.message }),
  });
  const deleteVehicleMutation = useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.from('vehicles').update({ is_deleted: true }).eq('id', id); if (error) throw error; }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vehicles'] }); toast.success('Vehículo eliminado'); }, onError: (error) => toast.error('Error al eliminar vehículo', { description: error.message }) });
  const addClientMutation = useMutation({ mutationFn: async (data: Partial<DomainClient>) => { const { data: result, error } = await supabase.from('clients').insert(toSbClient(data) as any).select().single(); if (error) throw error; return toDomainClient(result); }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clients'] }); toast.success('Cliente agregado exitosamente'); }, onError: (error) => toast.error('Error al agregar cliente', { description: error.message }) });
  const updateClientMutation = useMutation({ mutationFn: async ({ id, ...data }: Partial<DomainClient> & { id: string }) => { const { error } = await supabase.from('clients').update(toSbClient(data) as any).eq('id', id); if (error) throw error; }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clients'] }); toast.success('Cliente actualizado'); }, onError: (error) => toast.error('Error al actualizar cliente', { description: error.message }) });
  const deleteClientMutation = useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.from('clients').update({ is_deleted: true }).eq('id', id); if (error) throw error; }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clients'] }); toast.success('Cliente eliminado'); }, onError: (error) => toast.error('Error al eliminar cliente', { description: error.message }) });
  const addPartnerMutation = useMutation({ mutationFn: async (data: Partial<DomainPartner>) => { const { data: result, error } = await supabase.from('partners').insert({ ...toSbPartner(data), is_deleted: false } as any).select().single(); if (error) throw error; return toDomainPartner(result); }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['partners'] }); toast.success('Socio agregado exitosamente'); }, onError: (error) => toast.error('Error al agregar socio', { description: error.message }) });
  const updatePartnerMutation = useMutation({ mutationFn: async ({ id, ...data }: Partial<DomainPartner> & { id: string }) => { const { error } = await supabase.from('partners').update(toSbPartner(data) as any).eq('id', id); if (error) throw error; }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['partners'] }); toast.success('Socio actualizado'); }, onError: (error) => toast.error('Error al actualizar socio', { description: error.message }) });
  const deletePartnerMutation = useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.from('partners').update({ is_deleted: true }).eq('id', id); if (error) throw error; }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['partners'] }); toast.success('Socio eliminado'); }, onError: (error) => toast.error('Error al eliminar socio', { description: error.message }) });
  const addCompanyMutation = useMutation({ mutationFn: async (data: Partial<DomainCompany>) => { const { data: result, error } = await supabase.from('companies').insert(toSbCompany(data) as any).select().single(); if (error) throw error; return toDomainCompany(result); }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['companies'] }); toast.success('Empresa agregada exitosamente'); }, onError: (error) => toast.error('Error al agregar empresa', { description: error.message }) });
  const updateCompanyMutation = useMutation({ mutationFn: async ({ id, ...data }: Partial<DomainCompany> & { id: string }) => { const { error } = await supabase.from('companies').update(toSbCompany(data) as any).eq('id', id); if (error) throw error; }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['companies'] }); toast.success('Empresa actualizada'); }, onError: (error) => toast.error('Error al actualizar empresa', { description: error.message }) });
  const deleteCompanyMutation = useMutation({ mutationFn: async (id: string) => { const { data: vehicles } = await supabase.from('vehicles').select('id').eq('company_id', id).eq('is_deleted', false); if (vehicles && vehicles.length > 0) throw new Error('No se puede eliminar una empresa con vehículos activos'); const { error } = await supabase.from('companies').update({ is_deleted: true }).eq('id', id); if (error) throw error; }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['companies'] }); toast.success('Empresa eliminada'); }, onError: (error) => toast.error('Error al eliminar empresa', { description: error.message }) });
  const addFinancialCategoryMutation = useMutation({ mutationFn: async (data: Partial<DomainFinancialCategory>) => { const { data: result, error } = await supabase.from('financial_categories').insert(toSbFinancialCategory(data) as any).select().single(); if (error) throw error; return toDomainFinancialCategory(result); }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['financial_categories'] }); toast.success('Categoría agregada'); }, onError: (error) => toast.error('Error al agregar categoría', { description: error.message }) });
  const updateFinancialCategoryMutation = useMutation({ mutationFn: async ({ id, ...data }: Partial<DomainFinancialCategory> & { id: string }) => { const { error } = await supabase.from('financial_categories').update(toSbFinancialCategory(data) as any).eq('id', id); if (error) throw error; }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['financial_categories'] }); toast.success('Categoría actualizada'); }, onError: (error) => toast.error('Error al actualizar categoría', { description: error.message }) });
  const deleteFinancialCategoryMutation = useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.from('financial_categories').delete().eq('id', id); if (error) throw error; }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['financial_categories'] }); toast.success('Categoría eliminada'); }, onError: (error) => toast.error('Error al eliminar categoría', { description: error.message }) });
  const addFinancialRecordMutation = useMutation({ mutationFn: async (data: Partial<DomainFinancialRecord>) => { const result = await createFinancialRecord(toSbFinancialRecord(data) as any); return toDomainFinancialRecord(result as any); }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['financial_records'] }); toast.success('Registro agregado'); }, onError: (error) => toast.error('Error al agregar registro', { description: error.message }) });
  const updateFinancialRecordMutation = useMutation({ mutationFn: async ({ id, ...data }: Partial<DomainFinancialRecord> & { id: string }) => { await updateFinancialRecordMetadata(id, toSbFinancialRecord(data) as any); }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['financial_records'] }); toast.success('Registro actualizado'); }, onError: (error) => toast.error('Error al actualizar registro', { description: error.message }) });
  const addCreditMutation = useMutation({ mutationFn: async (data: Partial<DomainCredit>) => { const result = await createCreditAtomic(toSbCredit(data) as any); return toDomainCredit(result as any); }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['credits'] }); toast.success('Crédito agregado'); }, onError: (error) => toast.error('Error al agregar crédito', { description: error.message }) });
  const updateCreditMutation = useMutation({ mutationFn: async ({ id, ...data }: Partial<DomainCredit> & { id: string }) => { const { error } = await supabase.from('credits').update(toSbCredit(data) as any).eq('id', id); if (error) throw error; }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['credits'] }); toast.success('Crédito actualizado'); }, onError: (error) => toast.error('Error al actualizar crédito', { description: error.message }) });
  const deleteCreditMutation = useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.from('credits').update({ is_deleted: true }).eq('id', id); if (error) throw error; }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['credits'] }); toast.success('Crédito eliminado'); }, onError: (error) => toast.error('Error al eliminar crédito', { description: error.message }) });
  const addMileageLogMutation = useMutation({ mutationFn: async (data: Partial<DomainMileageLog>) => { const { data: result, error } = await supabase.from('mileage_logs').insert(toSbMileageLog(data) as any).select().single(); if (error) throw error; return toDomainMileageLog(result); }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['mileage_logs'] }); queryClient.invalidateQueries({ queryKey: ['vehicles'] }); toast.success('Registro de kilometraje agregado'); }, onError: (error) => toast.error('Error al agregar registro', { description: error.message }) });
  const updateMileageLogMutation = useMutation({ mutationFn: async ({ id, ...data }: Partial<DomainMileageLog> & { id: string }) => { const { error } = await supabase.from('mileage_logs').update(toSbMileageLog(data) as any).eq('id', id); if (error) throw error; }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['mileage_logs'] }); toast.success('Registro actualizado'); }, onError: (error) => toast.error('Error al actualizar registro', { description: error.message }) });
  const deleteMileageLogMutation = useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.from('mileage_logs').delete().eq('id', id); if (error) throw error; }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['mileage_logs'] }); toast.success('Registro eliminado'); }, onError: (error) => toast.error('Error al eliminar registro', { description: error.message }) });
  const markNotificationAsReadMutation = useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', id); if (error) throw error; }, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }), onError: (error) => logger.error('Error marking notification as read', error) });
  const addMessageTemplateMutation = useMutation({ mutationFn: async (data: Partial<DomainMessageTemplate>) => { const { data: result, error } = await supabase.from('message_templates').insert({ ...toSbMessageTemplate(data), updated_at: new Date().toISOString() } as any).select().single(); if (error) throw error; return toDomainMessageTemplate(result); }, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['message_templates'] }) });
  const updateMessageTemplateMutation = useMutation({ mutationFn: async ({ id, ...data }: Partial<DomainMessageTemplate> & { id: string }) => { const { error } = await supabase.from('message_templates').update({ ...toSbMessageTemplate(data), updated_at: new Date().toISOString() } as any).eq('id', id); if (error) throw error; }, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['message_templates'] }) });
  const deleteMessageTemplateMutation = useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.from('message_templates').delete().eq('id', id); if (error) throw error; }, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['message_templates'] }) });

  const addExpense = useCallback(async (data: Partial<DomainFinancialRecord>) => { const category = allFinancialCategories.find(c => c.id === data.categoryId); const isMaintenance = category?.name === MAINTENANCE_CATEGORY; const recordData = { ...data, type: 'expense' as const, createdAt: new Date().toISOString() }; await addFinancialRecordMutation.mutateAsync(recordData); if (data.mileageAtExpense && data.vehicleId) { await addMileageLogMutation.mutateAsync({ vehicleId: data.vehicleId, mileage: data.mileageAtExpense, date: data.date, source: 'expense', kind: isMaintenance ? 'maintenance' : 'odometer', financialRecordId: data.id, notes: data.description, companyId: data.companyId, isDeleted: false }); const { error } = await supabase.from('vehicles').update({ current_mileage: data.mileageAtExpense, ...(isMaintenance && { last_maintenance_mileage: data.mileageAtExpense }) }).eq('id', data.vehicleId); if (error) throw error; } }, [allFinancialCategories, addFinancialRecordMutation, addMileageLogMutation]);
  const addIncome = useCallback(async (data: Partial<DomainFinancialRecord>) => { await addFinancialRecordMutation.mutateAsync({ ...data, type: 'income' as const, createdAt: new Date().toISOString() } as any); }, [addFinancialRecordMutation]);
  const addPayment = useCallback(async (data: Partial<DomainFinancialRecord>) => { await addFinancialRecordMutation.mutateAsync({ ...data, type: 'payment' as const, category: CLIENT_PAYMENT_CATEGORY, createdAt: new Date().toISOString() } as any); }, [addFinancialRecordMutation]);
  const createCreditWithFinancialRecord = useCallback(async (creditData: Partial<DomainCredit>, companyId: string): Promise<string | null> => { if (!currentUser?.uid) throw new Error('Usuario no autenticado'); try { const result = await createCreditAtomic({ ...toSbCredit(creditData), companyId }); const creditId = (result as any)?.id; if (!creditId) throw new Error('La creación del crédito no devolvió un ID válido'); await refreshData(); return creditId; } catch (error) { logger.error('Error creating credit:', error); throw error; } }, [currentUser, refreshData]);
  const processCreditPayment = useCallback(async (creditId: string, clientId: string, amount: number, paymentMethod?: string, description?: string, companyId?: string, categoryId?: string) => { try { if (!currentUser?.uid) throw new Error('Usuario no autenticado'); if (!companyId && !currentUser.companyId) throw new Error('Empresa no disponible para procesar el pago'); if (!Number.isFinite(amount) || amount <= 0) throw new Error('El monto del pago debe ser mayor que cero'); const { data, error } = await supabase.rpc('process_credit_payment_atomic', { p_company_id: companyId || currentUser.companyId, p_credit_id: creditId, p_client_id: clientId, p_amount: amount, p_payment_date: new Date().toISOString().slice(0, 10), p_payment_method: paymentMethod || 'transferencia', p_reference: description || null, p_created_by: null }); if (error) throw error; await refreshData(); const result = (data || {}) as any; return { success: result.success !== false, newCreditBalance: Number(result.newCreditBalance ?? result.new_remaining_balance ?? result.remaining_balance ?? 0), creditId: result.creditId ?? result.credit_id ?? creditId, paymentScheduleId: result.paymentScheduleId ?? result.payment_schedule_id ?? null, creditCompleted: result.creditCompleted ?? result.credit_completed ?? result.status === 'completed' ?? false, ...(result.error ? { error: result.error } : {}) }; } catch (error: any) { logger.error('Error processing credit payment:', error); return { success: false, error: error?.message || 'No fue posible procesar el pago', newCreditBalance: 0, creditId: null, paymentScheduleId: null }; } }, [currentUser, refreshData]);
  const cancelCreditWithAdjustment = useCallback(async (creditId: string, reason?: string) => { if (!currentUser?.uid) throw new Error('Usuario no autenticado'); try { const { data: credit } = await supabase.from('credits').select('*').eq('id', creditId).single(); if (!credit) throw new Error('Crédito no encontrado'); if (credit.status !== 'active') throw new Error('El crédito no está activo'); const remainingBalance = credit.remaining_balance || 0; await supabase.from('credits').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', creditId); await supabase.from('clients').update({ has_active_credit: false, active_credit_id: null }).eq('id', credit.client_id); if (credit.vehicle_id) {
        const now = new Date().toISOString();
        const { data: openAssignments, error: assignmentLookupError } = await supabase
          .from('vehicle_assignment_logs')
          .select('id')
          .eq('vehicle_id', credit.vehicle_id)
          .is('unassigned_at', null);
        if (assignmentLookupError) throw assignmentLookupError;
        if (openAssignments?.length) {
          const { error: assignmentCloseError } = await supabase
            .from('vehicle_assignment_logs')
            .update({
              unassigned_at: now,
              end_date: now,
              reason: reason ? `Crédito cancelado: ${reason}` : 'Crédito cancelado',
            })
            .in('id', openAssignments.map(log => log.id));
          if (assignmentCloseError) throw assignmentCloseError;
        }
        const { error: vehicleUnlockError } = await supabase
          .from('vehicles')
          .update({ ...toSbVehicle(buildVehicleCreditUnlockPayload()), client_id: null, updated_at: now } as any)
          .eq('id', credit.vehicle_id);
        if (vehicleUnlockError) throw vehicleUnlockError;
      } await supabase.from('credit_payment_schedules').update({ status: 'cancelled' }).eq('credit_id', creditId).eq('status', 'pending'); if (remainingBalance > 0) { const categoryId = await resolveCategoryIdByAffects('credit_payment', 'Pago de Crédito'); await addFinancialRecordMutation.mutateAsync({ companyId: credit.company_id, clientId: credit.client_id, vehicleId: credit.vehicle_id, categoryId, category: 'Nota de Crédito', type: 'payment', amount: remainingBalance, description: `Nota de Crédito - Cancelación: ${reason || 'Sin motivo'}`, date: new Date().toISOString(), creditId, isDeleted: false, createdBy: currentUser.uid }); } await refreshData(); toast.success('Crédito cancelado exitosamente'); } catch (error: any) { toast.error('Error al cancelar crédito', { description: error.message }); throw error; } }, [currentUser, addFinancialRecordMutation, refreshData]);
  const createVehicleAssignment = useCallback(async (input: NewAssignmentInput) => { if (!currentUser?.uid) throw new Error('Usuario no autenticado'); try { const { data: vehicle, error: vehicleError } = await supabase.from('vehicles').select('*').eq('id', input.vehicleId).single(); if (vehicleError || !vehicle) throw new Error('Vehículo no encontrado'); const { data: openLogsRaw } = await supabase.from('vehicle_assignment_logs').select('*').eq('vehicle_id', input.vehicleId).is('unassigned_at', null); const openLogs = (openLogsRaw || []).map(toDomainVehicleAssignmentLog); const availability = checkVehicleAssignmentAvailability({ lockedByCredit: vehicle.locked_by_credit }, openLogs, input.clientId); if (!availability.available) throw new Error(availability.error); const now = new Date().toISOString(); for (const openLog of openLogs) await supabase.from('vehicle_assignment_logs').update({ unassigned_at: now }).eq('id', openLog.id); const payload = buildAssignmentLogPayload({ ...input, assignedBy: currentUser.uid }, now); const { error: insertError } = await supabase.from('vehicle_assignment_logs').insert(toSbVehicleAssignmentLog(payload) as any); if (insertError) throw insertError; await supabase.from('vehicles').update({ client_id: input.clientId, status: 'rented', updated_at: now }).eq('id', input.vehicleId); await Promise.all([queryClient.invalidateQueries({ queryKey: ['vehicle_assignment_logs'] }), queryClient.invalidateQueries({ queryKey: ['vehicles'] })]); toast.success('Asignación registrada exitosamente'); } catch (error: any) { toast.error('Error al registrar la asignación', { description: error.message }); throw error; } }, [currentUser, queryClient]);
  const endVehicleAssignment = useCallback(async (assignmentLogId: string, vehicleId: string) => { try { const now = new Date().toISOString(); const { error: updateLogError } = await supabase.from('vehicle_assignment_logs').update({ unassigned_at: now }).eq('id', assignmentLogId); if (updateLogError) throw updateLogError; const { data: vehicle } = await supabase.from('vehicles').select('locked_by_credit').eq('id', vehicleId).single(); if (!vehicle?.locked_by_credit) await supabase.from('vehicles').update({ client_id: null, status: 'active', updated_at: now }).eq('id', vehicleId); await Promise.all([queryClient.invalidateQueries({ queryKey: ['vehicle_assignment_logs'] }), queryClient.invalidateQueries({ queryKey: ['vehicles'] })]); toast.success('Asignación finalizada'); } catch (error: any) { toast.error('Error al finalizar la asignación', { description: error.message }); throw error; } }, [queryClient]);
  const deleteCreditWithCleanup = useCallback(async (creditId: string) => { await cancelCreditWithAdjustment(creditId, 'Cancelación de crédito solicitada (cleanup). Se conserva historial y registros financieros.'); }, [cancelCreditWithAdjustment]);
  const addMulta = useCallback(async (data: Partial<DomainMulta>) => {
    if (!currentUser?.uid) throw new Error('Usuario no autenticado');
    const companyId = data.companyId || currentUser.companyId;
    if (!companyId) throw new Error('Empresa no disponible para registrar la multa');
    const { data: result, error } = await supabase.rpc('create_multa_atomic', {
      p_record: toSbMulta({ ...data, companyId, createdBy: data.createdBy || currentUser.uid }) as any,
    });
    if (error) throw error;
    if (!result?.multa_id) throw new Error('La base de datos no devolvió la multa creada');
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['multas'] }),
      queryClient.invalidateQueries({ queryKey: ['financial_records'] }),
      queryClient.invalidateQueries({ queryKey: ['clients'] }),
    ]);
    await refreshData();
    const { data: multa, error: multaError } = await supabase.from('multas').select('*').eq('id', result.multa_id).single();
    if (multaError || !multa) throw multaError || new Error('No se pudo recuperar la multa creada');
    return toDomainMulta(multa);
  }, [currentUser, queryClient, refreshData]);
  const processMultaPayment = useCallback(async (multaId: string, paymentData: Partial<DomainFinancialRecord>) => {
    if (!currentUser?.uid) throw new Error('Usuario no autenticado');
    const companyId = paymentData.companyId || currentUser.companyId;
    if (!companyId) throw new Error('Empresa no disponible para procesar el pago');
    if (!paymentData.date) throw new Error('Fecha de pago requerida');
    if (!Number.isFinite(paymentData.amount) || Number(paymentData.amount) <= 0) throw new Error('Importe de pago inválido');

    const { data, error } = await supabase.rpc('process_multa_payment_atomic', {
      p_multa_id: multaId,
      p_client_id: paymentData.clientId || null,
      p_vehicle_id: paymentData.vehicleId || null,
      p_company_id: companyId,
      p_amount: paymentData.amount,
      p_date: paymentData.date,
      p_payment_method: paymentData.paymentMethod || null,
      p_description: paymentData.description || null,
      p_created_by: currentUser.uid,
    });
    if (error) throw error;
    if (!data) throw new Error('El pago de la multa no devolvió confirmación');
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['multas'] }),
      queryClient.invalidateQueries({ queryKey: ['financial_records'] }),
    ]);
    await refreshData();
  }, [currentUser, queryClient, refreshData]);

  const contextValue: DataContextType = { vehicles, rawVehicles: allVehicles, allVehicles, allClients, clients: allClients, allClientsBase: allClients, partners: allPartners, credits: allCredits, financialRecords: allFinancialRecords, notifications: allNotifications, mileageLogs: allMileageLogs, users: [], vehicleAssignmentLogs: allVehicleAssignmentLogs, companies: rawCompanies, rawCompanies, financialCategories: allFinancialCategories, messageTemplates: allMessageTemplates, messageLogs: [], creditPaymentSchedules: allCreditPaymentSchedules, multas: allMultas, loadingData, selectedCompanyId, setSelectedCompanyId, clientBalances, partnerBalances, vehicleMetrics, clientMetrics, addVehicle: data => addVehicleMutation.mutateAsync(data), updateVehicle: (id, data) => updateVehicleMutation.mutateAsync({ ...data, id }), deleteVehicle: id => deleteVehicleMutation.mutateAsync(id), addClient: data => addClientMutation.mutateAsync(data), updateClient: (id, data) => updateClientMutation.mutateAsync({ ...data, id }), deleteClient: id => deleteClientMutation.mutateAsync(id), addPartner: data => addPartnerMutation.mutateAsync(data), updatePartner: (id, data) => updatePartnerMutation.mutateAsync({ ...data, id }), deletePartner: id => deletePartnerMutation.mutateAsync(id), addCompany: data => addCompanyMutation.mutateAsync(data), updateCompany: (id, data) => updateCompanyMutation.mutateAsync({ ...data, id }), deleteCompany: id => deleteCompanyMutation.mutateAsync(id), addFinancialCategory: data => addFinancialCategoryMutation.mutateAsync(data), updateFinancialCategory: (id, data) => updateFinancialCategoryMutation.mutateAsync({ ...data, id }), deleteFinancialCategory: id => deleteFinancialCategoryMutation.mutateAsync(id), addFinancialRecord: data => addFinancialRecordMutation.mutateAsync(data), updateFinancialRecord: (id, data) => updateFinancialRecordMutation.mutateAsync({ ...data, id }), deleteFinancialRecord: async (id, onSuccess) => { const { error } = await supabase.from('financial_records').update({ is_deleted: true }).eq('id', id); if (error) throw error; await refreshData(); if (onSuccess) onSuccess(); }, addExpense, updateExpense: (id, data) => updateFinancialRecordMutation.mutateAsync({ ...data, id }), addIncome, updateIncome: (id, data) => updateFinancialRecordMutation.mutateAsync({ ...data, id }), addPayment, updatePayment: (id, data) => updateFinancialRecordMutation.mutateAsync({ ...data, id }), addCredit: data => addCreditMutation.mutateAsync(data), updateCredit: (id, data) => updateCreditMutation.mutateAsync({ ...data, id }), deleteCredit: id => deleteCreditMutation.mutateAsync(id), deactivateCredit: async id => { const { data: credit, error: creditError } = await supabase.from('credits').select('id, vehicle_id, client_id').eq('id', id).single(); if (creditError) throw creditError; if (!credit) throw new Error('Crédito no encontrado'); const { error: creditUpdateError } = await supabase.from('credits').update({ status: 'inactive' }).eq('id', credit.id); if (creditUpdateError) throw creditUpdateError; if (credit.vehicle_id) { const { error: vehicleError } = await supabase.from('vehicles').update({ status: 'active', client_id: null }).eq('id', credit.vehicle_id); if (vehicleError) throw vehicleError; } await refreshData(); }, createCreditWithFinancialRecord, processCreditPayment, cancelCredit: cancelCreditWithAdjustment, cancelCreditWithAdjustment, deleteCreditWithCleanup, createVehicleAssignment, endVehicleAssignment, addMileageLog: async data => { await addMileageLogMutation.mutateAsync(data as any); }, updateMileageLog: (id, data) => updateMileageLogMutation.mutateAsync({ ...data, id }), deleteMileageLog: id => deleteMileageLogMutation.mutateAsync(id), markNotificationAsRead: id => markNotificationAsReadMutation.mutateAsync(id), addMessageTemplate: data => addMessageTemplateMutation.mutateAsync(data), updateMessageTemplate: (id, data) => updateMessageTemplateMutation.mutateAsync({ ...data, id }), deleteMessageTemplate: id => deleteMessageTemplateMutation.mutateAsync(id), sendInternalMessage: async () => { toast.info('Función no implementada'); }, addMulta, updateMulta: async (id, data) => {
      const companyId = data.companyId || currentUser?.companyId;
      if (!companyId) throw new Error('Empresa no disponible para actualizar la multa');
      if (data.status === 'cancelada') {
        const { data: result, error } = await supabase.rpc('cancel_multa_atomic', {
          p_multa_id: id,
          p_company_id: companyId,
          p_cancel_reason: 'Multa cancelada desde FleetEase',
          p_created_by: currentUser?.uid || null,
        } as any);
        if (error) throw error;
        if (!result) throw new Error('La base de datos no devolvió confirmación de cancelación');
      } else {
        const { error } = await supabase.from('multas').update(toSbMulta(data) as any).eq('id', id).eq('company_id', companyId);
        if (error) throw error;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['multas'] }),
        queryClient.invalidateQueries({ queryKey: ['financial_records'] }),
        queryClient.invalidateQueries({ queryKey: ['clients'] }),
      ]);
      await refreshData();
    }, deleteMulta: async id => {
      const companyId = currentUser?.companyId;
      if (!companyId) throw new Error('Empresa no disponible para eliminar la multa');
      const { data, error } = await supabase.rpc('cancel_multa_atomic', {
        p_multa_id: id,
        p_company_id: companyId,
        p_cancel_reason: 'Multa eliminada/cancelada desde FleetEase',
        p_created_by: currentUser?.uid || null,
      } as any);
      if (error) throw error;
      if (!data) throw new Error('La base de datos no devolvió confirmación de cancelación');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['multas'] }),
        queryClient.invalidateQueries({ queryKey: ['financial_records'] }),
        queryClient.invalidateQueries({ queryKey: ['clients'] }),
      ]);
      await refreshData();
    },
    processMultaPayment, getVehicleById: id => vehicles.find(v => v.id === id), getVehicleWithDetailsById: id => vehicles.find(v => v.id === id), refreshData, handleCreditUpdate: async () => false };
  return <DataContext.Provider value={contextValue}>{children}</DataContext.Provider>;
}

export function useData() { const context = useContext(DataContext); if (context === undefined) throw new Error('useData must be used within a DataProvider'); return context; }
