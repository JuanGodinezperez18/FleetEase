/**
 * @fileoverview Mapeadores entre la capa de persistencia (Supabase, snake_case)
 * y el modelo de dominio usado por la UI (camelCase).
 *
 * La UI consume tipos de @/types (dominio) y estos helpers concentran esa conversión.
 */

import type { Database } from '@/lib/supabase-browser';
import type { Json } from '@/lib/supabase-browser';
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
} from '@/types';

type TableRow<Name extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][Name]['Row'];
type SbClient = TableRow<'clients'>;
type SbVehicle = TableRow<'vehicles'>;
type SbPartner = TableRow<'partners'>;
type SbCredit = TableRow<'credits'>;
type SbFinancialRecord = TableRow<'financial_records'>;
type SbMileageLog = TableRow<'mileage_logs'>;
type SbNotification = TableRow<'notifications'>;
type SbVehicleAssignmentLog = TableRow<'vehicle_assignment_logs'>;
type SbCompany = TableRow<'companies'>;
type SbFinancialCategory = TableRow<'financial_categories'>;
type SbMessageTemplate = TableRow<'message_templates'>;
type SbMessageLog = TableRow<'message_logs'>;
type SbCreditPaymentSchedule = TableRow<'credit_payment_schedules'>;
type SbMulta = TableRow<'multas'>;

function snakeToCamelKey(key: string): string {
  return key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function camelToSnakeKey(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

function mapKeys<T>(obj: Record<string, unknown>, mapper: (k: string) => string): T {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    out[mapper(key)] = value === null ? undefined : value;
  }
  return out as T;
}

// =====================================================
// PERSISTENCIA → DOMINIO
// =====================================================

export const toDomainClient = (row: SbClient): Client => mapKeys<Client>(row as unknown as Record<string, unknown>, snakeToCamelKey);
export const toDomainVehicle = (row: SbVehicle): Vehicle => mapKeys<Vehicle>(row as unknown as Record<string, unknown>, snakeToCamelKey);
export const toDomainPartner = (row: SbPartner): Partner => mapKeys<Partner>(row as unknown as Record<string, unknown>, snakeToCamelKey);
export const toDomainCredit = (row: SbCredit): Credit => mapKeys<Credit>(row as unknown as Record<string, unknown>, snakeToCamelKey);
export const toDomainFinancialRecord = (row: SbFinancialRecord): FinancialRecord => mapKeys<FinancialRecord>(row as unknown as Record<string, unknown>, snakeToCamelKey);
export const toDomainMileageLog = (row: SbMileageLog): MileageLog => mapKeys<MileageLog>(row as unknown as Record<string, unknown>, snakeToCamelKey);
export const toDomainNotification = (row: SbNotification): Notification => mapKeys<Notification>(row as unknown as Record<string, unknown>, snakeToCamelKey);
function photoUrls(value: Json): Record<string, string> | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  const entries = Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string');
  return Object.fromEntries(entries);
}

export const toDomainVehicleAssignmentLog = (row: SbVehicleAssignmentLog): VehicleAssignmentLog => ({
  ...mapKeys<VehicleAssignmentLog>(row as unknown as Record<string, unknown>, snakeToCamelKey),
  photos: row.photos === null ? null : photoUrls(row.photos),
});
export const toDomainCompany = (row: SbCompany): Company => mapKeys<Company>(row as unknown as Record<string, unknown>, snakeToCamelKey);
export const toDomainFinancialCategory = (row: SbFinancialCategory): FinancialCategory => mapKeys<FinancialCategory>(row as unknown as Record<string, unknown>, snakeToCamelKey);
export const toDomainMessageTemplate = (row: SbMessageTemplate): MessageTemplate => mapKeys<MessageTemplate>(row as unknown as Record<string, unknown>, snakeToCamelKey);
export const toDomainMessageLog = (row: SbMessageLog): MessageLog => mapKeys<MessageLog>(row as unknown as Record<string, unknown>, snakeToCamelKey);
export const toDomainCreditPaymentSchedule = (row: SbCreditPaymentSchedule): CreditPaymentSchedule => mapKeys<CreditPaymentSchedule>(row as unknown as Record<string, unknown>, snakeToCamelKey);
export const toDomainMulta = (row: SbMulta): Multa => mapKeys<Multa>(row as unknown as Record<string, unknown>, snakeToCamelKey);

// =====================================================
// DOMINIO → PERSISTENCIA
// =====================================================

export const toSbClient = (data: Partial<Client>): Record<string, unknown> => mapKeys(data as unknown as Record<string, unknown>, camelToSnakeKey);
export const toSbVehicle = (data: Partial<Vehicle>): Record<string, unknown> => mapKeys(data as unknown as Record<string, unknown>, camelToSnakeKey);

/**
 * partners.name es NOT NULL en PostgreSQL, pero el formulario trabaja con
 * firstname/lastname. Garantizamos aquí el campo canónico para que cualquier
 * inserción/actualización de socios sea consistente aunque el caller no lo
 * incluya explícitamente.
 */
export const toSbPartner = (data: Partial<Partner>): Record<string, unknown> => {
  const mapped = mapKeys<Record<string, unknown>>(data as unknown as Record<string, unknown>, camelToSnakeKey);
  const firstName = typeof mapped.firstname === 'string' ? mapped.firstname.trim() : '';
  const lastName = typeof mapped.lastname === 'string' ? mapped.lastname.trim() : '';
  const suppliedName = typeof mapped.name === 'string' ? mapped.name.trim() : '';

  if (!suppliedName && (firstName || lastName)) {
    mapped.name = [firstName, lastName].filter(Boolean).join(' ');
  }

  return mapped;
};

export const toSbCredit = (data: Partial<Credit>): Record<string, unknown> => mapKeys(data as unknown as Record<string, unknown>, camelToSnakeKey);
export const toSbFinancialRecord = (data: Partial<FinancialRecord>): Record<string, unknown> => mapKeys(data as unknown as Record<string, unknown>, camelToSnakeKey);

/**
 * mileage_logs no tiene columnas client_id ni last_mileage.
 *
 * clientId y lastMileage son datos de contexto/validación del formulario:
 * - clientId se usa para la UI y se deriva del vehículo/asignación.
 * - lastMileage representa el valor anterior usado para validar el nuevo
 *   kilometraje y NO debe persistirse en mileage_logs.
 *
 * El error "Could not find the 'last_mileage' column of 'mileage_logs' in the
 * schema cache" aparecía porque el mapper genérico convertía lastMileage en
 * last_mileage antes del INSERT. Se eliminan ambos campos aquí para que todos
 * los formularios que reutilizan addMileageLog queden protegidos.
 */
export const toSbMileageLog = (
  data: Partial<MileageLog> & { clientId?: string | null; lastMileage?: number | null }
): Record<string, unknown> => {
  const { clientId: _clientId, lastMileage: _lastMileage, ...persistable } = data;
  return mapKeys(persistable as Record<string, unknown>, camelToSnakeKey);
};

export const toSbNotification = (data: Partial<Notification>): Record<string, unknown> => mapKeys(data as unknown as Record<string, unknown>, camelToSnakeKey);
export const toSbVehicleAssignmentLog = (data: Partial<VehicleAssignmentLog>): Record<string, unknown> => mapKeys(data as unknown as Record<string, unknown>, camelToSnakeKey);
export const toSbCompany = (data: Partial<Company>): Record<string, unknown> => mapKeys(data as unknown as Record<string, unknown>, camelToSnakeKey);
export const toSbFinancialCategory = (data: Partial<FinancialCategory>): Record<string, unknown> => mapKeys(data as unknown as Record<string, unknown>, camelToSnakeKey);
export const toSbMessageTemplate = (data: Partial<MessageTemplate>): Record<string, unknown> => mapKeys(data as unknown as Record<string, unknown>, camelToSnakeKey);
export const toSbMessageLog = (data: Partial<MessageLog>): Record<string, unknown> => mapKeys(data as unknown as Record<string, unknown>, camelToSnakeKey);
export const toSbCreditPaymentSchedule = (data: Partial<CreditPaymentSchedule>): Record<string, unknown> => mapKeys(data as unknown as Record<string, unknown>, camelToSnakeKey);
export const toSbMulta = (data: Partial<Multa>): Record<string, unknown> => mapKeys(data as unknown as Record<string, unknown>, camelToSnakeKey);
