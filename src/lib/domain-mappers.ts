/**
 * @fileoverview Mapeadores entre la capa de persistencia (Supabase, snake_case)
 * y el modelo de dominio usado por la UI (camelCase).
 */

import type {
  Client as SbClient, Vehicle as SbVehicle, Partner as SbPartner, Credit as SbCredit,
  FinancialRecord as SbFinancialRecord, MileageLog as SbMileageLog, Notification as SbNotification,
  VehicleAssignmentLog as SbVehicleAssignmentLog, Company as SbCompany, FinancialCategory as SbFinancialCategory,
  MessageTemplate as SbMessageTemplate, MessageLog as SbMessageLog, CreditPaymentSchedule as SbCreditPaymentSchedule,
  Multa as SbMulta,
} from '@/types/supabase';
import type {
  Client, Vehicle, Partner, Credit, FinancialRecord, MileageLog, Notification,
  VehicleAssignmentLog, Company, FinancialCategory, MessageTemplate, MessageLog,
  CreditPaymentSchedule, Multa,
} from '@/types';

function snakeToCamelKey(key: string): string { return key.replace(/_([a-z])/g, (_, c) => c.toUpperCase()); }
function camelToSnakeKey(key: string): string { return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`); }
function mapKeys<T>(obj: Record<string, unknown>, mapper: (k: string) => string): T {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) out[mapper(key)] = obj[key] === null ? undefined : obj[key];
  return out as T;
}

export const toDomainClient = (row: SbClient): Client => mapKeys<Client>(row as any, snakeToCamelKey);
export const toDomainVehicle = (row: SbVehicle): Vehicle => mapKeys<Vehicle>(row as any, snakeToCamelKey);
export const toDomainPartner = (row: SbPartner): Partner => mapKeys<Partner>(row as any, snakeToCamelKey);
export const toDomainCredit = (row: SbCredit): Credit => mapKeys<Credit>(row as any, snakeToCamelKey);
export const toDomainFinancialRecord = (row: SbFinancialRecord): FinancialRecord => mapKeys<FinancialRecord>(row as any, snakeToCamelKey);
export const toDomainMileageLog = (row: SbMileageLog): MileageLog => mapKeys<MileageLog>(row as any, snakeToCamelKey);
export const toDomainNotification = (row: SbNotification): Notification => mapKeys<Notification>(row as any, snakeToCamelKey);
export const toDomainVehicleAssignmentLog = (row: SbVehicleAssignmentLog): VehicleAssignmentLog => mapKeys<VehicleAssignmentLog>(row as any, snakeToCamelKey);
export const toDomainCompany = (row: SbCompany): Company => mapKeys<Company>(row as any, snakeToCamelKey);
export const toDomainFinancialCategory = (row: SbFinancialCategory): FinancialCategory => mapKeys<FinancialCategory>(row as any, snakeToCamelKey);
export const toDomainMessageTemplate = (row: SbMessageTemplate): MessageTemplate => mapKeys<MessageTemplate>(row as any, snakeToCamelKey);
export const toDomainMessageLog = (row: SbMessageLog): MessageLog => mapKeys<MessageLog>(row as any, snakeToCamelKey);
export const toDomainCreditPaymentSchedule = (row: SbCreditPaymentSchedule): CreditPaymentSchedule => mapKeys<CreditPaymentSchedule>(row as any, snakeToCamelKey);
export const toDomainMulta = (row: SbMulta): Multa => mapKeys<Multa>(row as any, snakeToCamelKey);

export const toSbClient = (data: Partial<Client>): Record<string, unknown> => mapKeys(data as any, camelToSnakeKey);
export const toSbVehicle = (data: Partial<Vehicle>): Record<string, unknown> => mapKeys(data as any, camelToSnakeKey);

export const toSbPartner = (data: Partial<Partner>): Record<string, unknown> => {
  const mapped = mapKeys<Partner>(data as any, camelToSnakeKey) as Record<string, unknown>;
  const firstName = typeof mapped.firstname === 'string' ? mapped.firstname.trim() : '';
  const lastName = typeof mapped.lastname === 'string' ? mapped.lastname.trim() : '';
  const suppliedName = typeof mapped.name === 'string' ? mapped.name.trim() : '';
  if (!suppliedName && (firstName || lastName)) mapped.name = [firstName, lastName].filter(Boolean).join(' ');
  return mapped;
};

export const toSbCredit = (data: Partial<Credit>): Record<string, unknown> => mapKeys(data as any, camelToSnakeKey);
export const toSbFinancialRecord = (data: Partial<FinancialRecord>): Record<string, unknown> => mapKeys(data as any, camelToSnakeKey);
/** mileage_logs has no client_id column; clientId is UI context only. */
export const toSbMileageLog = (data: Partial<MileageLog> & { clientId?: string | null }): Record<string, unknown> => {
  const { clientId: _clientId, ...persistable } = data as any;
  return mapKeys(persistable, camelToSnakeKey);
};
export const toSbNotification = (data: Partial<Notification>): Record<string, unknown> => mapKeys(data as any, camelToSnakeKey);
export const toSbVehicleAssignmentLog = (data: Partial<VehicleAssignmentLog>): Record<string, unknown> => mapKeys(data as any, camelToSnakeKey);
export const toSbCompany = (data: Partial<Company>): Record<string, unknown> => mapKeys(data as any, camelToSnakeKey);
export const toSbFinancialCategory = (data: Partial<FinancialCategory>): Record<string, unknown> => mapKeys(data as any, camelToSnakeKey);
export const toSbMessageTemplate = (data: Partial<MessageTemplate>): Record<string, unknown> => mapKeys(data as any, camelToSnakeKey);
export const toSbMessageLog = (data: Partial<MessageLog>): Record<string, unknown> => mapKeys(data as any, camelToSnakeKey);
export const toSbCreditPaymentSchedule = (data: Partial<CreditPaymentSchedule>): Record<string, unknown> => mapKeys(data as any, camelToSnakeKey);
export const toSbMulta = (data: Partial<Multa>): Record<string, unknown> => mapKeys(data as any, camelToSnakeKey);
