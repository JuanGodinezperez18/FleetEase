/**
 * @fileoverview Tipos compartidos para Supabase
 * 
 * Estos tipos son compatibles con la base de datos PostgreSQL en Supabase
 * y reemplazan gradualmente los tipos de Firebase/Firestore
 */

// Eliminar dependencia de Firebase Timestamp
export type TimestampString = string; // ISO 8601 format

// Roles de usuario
export type UserRole = 'admin' | 'editor' | 'viewer' | 'super_admin' | 'partner' | 'client';

// Estados de vehículo
export type VehicleStatus = 'active' | 'inactive' | 'maintenance' | 'sold' | 'rented';

// Estados de cliente
export type ClientStatus = 'active' | 'inactive';

// Estados de licencia
export type LicenseStatus = 'active' | 'expired';

// Tipos de registro financiero
export type FinancialRecordType = 'income' | 'expense' | 'payment';

// Tipos de afectación de balance
export type BalanceAffects = 'client_balance' | 'partner_balance' | 'none' | 'security_deposit' | 'credit_payment' | 'credit_granted' | 'driver_payment';

// Estados de crédito
export type CreditStatus = 'active' | 'completed' | 'defaulted' | 'inactive' | 'cancelled';

// Estados de pago
export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';

// Estados de multa
export type MultaStatus = 'pendiente' | 'pagada' | 'en_proceso' | 'cancelada';

// Tipos de cambio de compañía
export type CompanyChangeType = 'created' | 'updated' | 'deleted' | 'limit_changed' | 'contract_uploaded' | 'contract_deleted';

// Tipos de cambio de cliente
export type ClientChangeType = 'created' | 'updated' | 'deleted' | 'vehicle_assigned' | 'vehicle_unassigned' | 'balance_updated' | 'deposit_updated' | 'document_uploaded' | 'credit_approved';

// Tipos de mensaje
export type MessageType = 'cliente' | 'socio' | 'usuario';

// Estados de envío de mensaje
export type MessageStatus = 'sent' | 'delivered' | 'failed';

// Tipos de entidad para documentos
export type DocumentEntityType = 'vehicle' | 'client' | 'partner' | 'company';

// Tipos de acción de auditoría
export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout';

// Tipos de fuente de registro de kilometraje
export type MileageSource = 'expense' | 'manual';

// Tipos de clase de registro de kilometraje
export type MileageKind = 'odometer' | 'maintenance';

// Estados de último pago
export type LastPaymentStatus = 'paid' | 'overdue' | 'pending';

// Planes de suscripción
export type SubscriptionPlan = 'free' | 'starter' | 'pro' | 'enterprise';

// =====================================================
// INTERFACES PRINCIPALES
// =====================================================

export interface Company {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  country?: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at?: string | null;
  default_rental_days?: number | null;
  maintenance_interval?: number | null;
  late_payment_fee?: number | null;
  grace_period_days?: number | null;
  email_notifications?: boolean | null;
  whatsapp_notifications?: boolean | null;
  contract_template_url?: string | null;
  vehicle_limit?: number | null;
  plan?: SubscriptionPlan | null;
  max_vehicles?: number | null;
  max_users?: number | null;
  plan_expires_at?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_status?: string | null;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  country?: string | null;
  role: UserRole;
  company_id?: string | null;
  partner_access?: string[] | null;
  notification_settings?: Record<string, any> | null;
  is_deleted: boolean;
  created_at: string;
  updated_at?: string | null;
  push_subscriptions?: Record<string, any> | null;
}

export interface Client {
  id: string;
  user_id?: string | null;
  firstname: string;
  lastname: string;
  email?: string | null;
  phone: string;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  country?: string | null;
  status: ClientStatus;
  is_deleted: boolean;
  created_at: string;
  updated_at?: string | null;
  vehicle_assigned_at?: string | null;
  license_number: string;
  license_expiry: string;
  license_status: LicenseStatus;
  initial_balance: number;
  balance: number;
  security_deposit: number;
  assigned_vehicle_id?: string | null;
  payment_behavior?: 'Excelente' | 'Bueno' | 'Regular' | 'Malo' | 'Crítico' | null;
  photo_url?: string | null;
  ine_url?: string | null;
  license_image_url?: string | null;
  company_id?: string | null;
  has_active_credit?: boolean | null;
  active_credit_id?: string | null;
}

export interface Vehicle {
  id: string;
  alias: string;
  make: string;
  model: string;
  year: number;
  plate: string;
  serial_number: string;
  color: string;
  status: VehicleStatus;
  client_id?: string | null;
  partner_id?: string | null;
  cost?: number | null;
  weekly_rental_value?: number | null;
  acquisition_date: string;
  maintenance_interval?: number | null;
  last_maintenance_mileage?: number | null;
  current_mileage: number;
  insurance_company?: string | null;
  insurance_policy_number?: string | null;
  insurance_expiry_date?: string | null;
  admin_commission?: number | null;
  is_deleted: boolean;
  created_at: string;
  updated_at?: string | null;
  company_id?: string | null;
  image_url?: string | null;
  circulation_card_url?: string | null;
  insurance_policy_document_url?: string | null;
  gps_phone_number?: string | null;
  gps_phone_company?: string | null;
  locked_by_credit?: boolean | null;
  associated_credit_id?: string | null;
}

export interface Partner {
  id: string;
  user_id?: string | null;
  firstname: string;
  lastname: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  country?: string | null;
  initial_balance?: number | null;
  balance: number;
  is_deleted: boolean;
  created_at: string;
  updated_at?: string | null;
  company_id?: string | null;
  vehicle_limit?: number | null;
}

export interface MileageLog {
  id: string;
  uid?: string | null;
  vehicle_id: string;
  mileage: number;
  date: string;
  notes?: string | null;
  source?: MileageSource | null;
  financial_record_id?: string | null;
  kind?: MileageKind | null;
  created_at: string;
  updated_at?: string | null;
  company_id?: string | null;
  is_deleted?: boolean | null;
  created_by?: string | null;
}

export interface FinancialCategory {
  id: string;
  name: string;
  type: FinancialRecordType;
  affects: BalanceAffects;
  description?: string | null;
  is_default?: boolean | null;
  company_id?: string | null;
  category?: string | null;
}

export interface FinancialRecord {
  id: string;
  company_id?: string | null;
  client_id?: string | null;
  vehicle_id?: string | null;
  partner_id?: string | null;
  category_id: string;
  category: string;
  type: FinancialRecordType;
  amount: number;
  payment_method?: string | null;
  description: string;
  date: string;
  credit_id?: string | null;
  credit_payment?: boolean | null;
  credit_granted?: boolean | null;
  credit_payment_number?: number | null;
  is_pending?: boolean | null;
  is_deleted: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at?: string | null;
  evidence_urls?: (string | null)[] | null;
  credit_payment_schedule_id?: string | null;
  mileage_at_expense?: number | null;
  notes?: string | null;
}

export interface Credit {
  id: string;
  uid?: string | null;
  client_id: string;
  vehicle_id: string;
  total_amount: number;
  paid_amount: number;
  remaining_balance: number;
  weekly_payment: number;
  number_of_payments: number;
  payments_made: number;
  start_date: string;
  status: CreditStatus;
  is_deleted: boolean;
  created_at: string;
  updated_at?: string | null;
  company_id?: string | null;
  last_payment_date?: string | null;
  last_payment_amount?: number | null;
  last_payment_status?: LastPaymentStatus | null;
}

export interface CreditPaymentSchedule {
  id: string;
  credit_id: string;
  payment_number: number;
  due_date: string;
  amount: number;
  status: PaymentStatus;
  paid_amount?: number | null;
  paid_date?: string | null;
  company_id?: string | null;
  is_deleted?: boolean | null;
  deleted_at?: string | null;
  cancelled_at?: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  uid?: string | null;
  type: string;
  message: string;
  date: string;
  is_read: boolean;
  related_id?: string | null;
  read_at?: string | null;
  company_id?: string | null;
}

export interface VehicleAssignmentLog {
  id: string;
  vehicle_id: string;
  client_id?: string | null;
  partner_id?: string | null;
  company_id?: string | null;
  assigned_at: string;
  unassigned_at?: string | null;
  assigned_by: string;
  reason?: string | null;
  created_at: string;
  start_date?: string | null;
  end_date?: string | null;
  /** Kilometraje del odómetro al momento de la entrega. */
  odometer_reading?: number | null;
  /** Nivel de combustible al momento de la entrega (ej. 'E', '1/4', '1/2', '3/4', 'F'). */
  fuel_level?: string | null;
  /** Notas de condición general del vehículo al entregarlo (rayones, golpes, etc.). */
  condition_notes?: string | null;
  /** Fotos de entrega, mismo patrón que vehicle_inspections.photos: { vista: url }. */
  photos?: Record<string, string> | null;
}

export interface CompanyChangeLog {
  id: string;
  company_id: string;
  change_type: CompanyChangeType;
  changed_by: string;
  changed_by_name: string;
  changed_at: string;
  description: string;
  field_changed?: string | null;
  previous_value?: any | null;
  new_value?: any | null;
}

export interface ClientChangeLog {
  id: string;
  client_id: string;
  change_type: ClientChangeType;
  changed_by: string;
  changed_by_name: string;
  changed_at: string;
  description: string;
  field_changed?: string | null;
  previous_value?: any | null;
  new_value?: any | null;
}

export interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  type: MessageType;
  company_id: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface MessageLog {
  id: string;
  recipient_id: string;
  recipient_name: string;
  recipient_type: MessageType;
  content: string;
  status: MessageStatus;
  sent_by: string;
  sent_at: string;
  company_id: string;
}

export interface Multa {
  id: string;
  vehicle_id: string;
  client_id?: string | null;
  folio?: string | null;
  fecha_infraccion: string;
  direccion: string;
  descripcion: string;
  importe: number;
  recargos?: number | null;
  total: number;
  status: MultaStatus;
  fecha_pago?: string | null;
  evidencia_urls?: (string | null)[] | null;
  notas?: string | null;
  asignado_automaticamente: boolean;
  assignment_date?: string | null;
  company_id: string;
  created_by: string;
  created_at: string;
  updated_at?: string | null;
  is_deleted: boolean;
}

export interface FcmToken {
  id: string;
  user_id: string;
  token: string;
  created_at: string;
  updated_at?: string | null;
}

export interface AuditLog {
  id: string;
  action: AuditAction;
  entity_type: string;
  entity_id: string;
  entity_name?: string | null;
  user_id: string;
  user_name?: string | null;
  timestamp: string;
  changes?: Record<string, any> | null;
  company_id?: string | null;
}

export interface Document {
  id: string;
  entity_type: DocumentEntityType;
  entity_id: string;
  document_type: string;
  file_url: string;
  file_name: string;
  uploaded_by: string;
  uploaded_at: string;
  company_id?: string | null;
  is_deleted?: boolean | null;
}

export interface GpsConfig {
  id: string;
  vehicle_id: string;
  device_imei?: string | null;
  device_type?: string | null;
  api_endpoint?: string | null;
  api_key?: string | null;
  refresh_interval?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
  company_id?: string | null;
}

export interface Seguimiento {
  id: string;
  vehicle_id: string;
  client_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  speed?: number | null;
  heading?: number | null;
  timestamp: string;
  notes?: string | null;
  photo_url?: string | null;
  created_by: string;
  company_id?: string | null;
}

// =====================================================
// INTERFACES EXTENDIDAS PARA UI
// =====================================================

export interface ClientWithMetrics extends Omit<Client, 'license_status' | 'payment_behavior'> {
  license_status?: LicenseStatus | 'Vigente' | 'Próxima a Vencer' | 'Vencida' | 'N/A';
  total_payments?: number;
  last_payment_date?: string;
  days_with_debt?: number;
  total_transactions?: number;
  total_income?: number;
  current_balance?: number;
  avg_transaction_value?: number;
  payment_frequency_days?: number | null;
  days_since_last_payment?: number | null;
  payment_behavior?: 'Excelente' | 'Bueno' | 'Regular' | 'Malo' | 'Crítico';
  activity_level?: 'Alto' | 'Medio' | 'Bajo' | 'Inactivo';
  days_until_license_expiry?: number | null;
  alerts?: string[];
  recommendations?: string[];
}

export interface ClientWithAllData extends Client {
  vehicle?: Vehicle | null;
  assigned_vehicle?: Vehicle | null;
}

export interface VehicleWithMileage extends Vehicle {
  display_current_mileage: string;
  display_last_maint_mileage: string;
  display_next_maint_due_at: string;
  display_km_to_next_maintenance: string;
  km_to_next_maintenance?: number;
  daily_average_km: number;
}

export interface MultaWithDetails extends Multa {
  vehicle_plate?: string;
  vehicle_alias?: string;
  client_name?: string;
  client_phone?: string;
  days_overdue?: number;
}

// =====================================================
// TIPOS PARA OPERACIONES DE BASE DE DATOS
// =====================================================

// Tipo para inserción (sin id ni timestamps generados)
export type Insert<T> = Omit<T, 'id' | 'created_at'>;

// Tipo para actualización (todos los campos opcionales excepto id)
export type Update<T> = Partial<Omit<T, 'id' | 'created_at'>> & { id: string };

// Tipo para filtros de consulta
export interface QueryFilters<T> {
  eq?: Partial<Record<keyof T, any>>;
  neq?: Partial<Record<keyof T, any>>;
  gt?: Partial<Record<keyof T, any>>;
  gte?: Partial<Record<keyof T, any>>;
  lt?: Partial<Record<keyof T, any>>;
  lte?: Partial<Record<keyof T, any>>;
  like?: Partial<Record<keyof T, any>>;
  in?: Partial<Record<keyof T, any[]>>;
}

// Tipo para opciones de consulta
export interface QueryOptions<T> {
  filters?: QueryFilters<T>;
  orderBy?: keyof T;
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// =====================================================
// TIPOS PARA PLANES E INVITACIONES
// =====================================================

export interface Plan {
  id: string;
  name: 'free' | 'starter' | 'pro' | 'enterprise';
  display_name: string;
  description?: string | null;
  price_monthly: number;
  price_yearly: number;
  max_users: number;
  max_vehicles: number;
  max_companies: number;
  features: string[];
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface UserInvitation {
  id: string;
  company_id: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  invited_by: string;
  invited_by_name: string;
  status: 'pending' | 'accepted' | 'expired';
  token: string;
  expires_at: string;
  accepted_at?: string | null;
  created_at: string;
}

export interface PlanLimitLog {
  id: string;
  company_id: string;
  user_id?: string | null;
  limit_type: 'users' | 'vehicles' | 'features';
  limit_value?: number | null;
  current_value?: number | null;
  action: 'blocked' | 'warning' | 'upgrade_prompt';
  message?: string | null;
  created_at: string;
}

export interface PlanLimitCheck {
  can_proceed: boolean;
  current_count: number;
  max_allowed: number;
  message: string;
}

