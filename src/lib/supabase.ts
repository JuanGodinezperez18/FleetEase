/**
 * @fileoverview Configuración del cliente de Supabase
 * 
 * Supabase reemplaza a Firebase como:
 * - Base de datos (PostgreSQL en lugar de Firestore)
 * - Autenticación (Supabase Auth en lugar de Firebase Auth)
 * - Almacenamiento (Supabase Storage en lugar de Firebase Storage)
 * 
 * Documentación: https://supabase.com/docs
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Validar que las variables de entorno estén configuradas
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️️ [Supabase] Variables de entorno no configuradas. Asegúrate de definir NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local');
}

// Tipo para el esquema de base de datos
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          phone?: string | null;
          street?: string | null;
          city?: string | null;
          state?: string | null;
          zip_code?: string | null;
          country?: string | null;
          role: 'admin' | 'editor' | 'viewer' | 'super_admin' | 'partner' | 'client';
          company_id?: string | null;
          partner_access?: string[] | null;
          notification_settings?: Record<string, any> | null;
          is_deleted: boolean;
          created_at: string;
          updated_at?: string | null;
          push_subscriptions?: Record<string, any> | null;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at'>>;
        Relationships: never[];
      };
      companies: {
        Row: {
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
          plan?: 'starter' | 'pro' | 'enterprise' | null;
          max_vehicles?: number | null;
          max_users?: number | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_status?: string | null;
        };
        Insert: Omit<Database['public']['Tables']['companies']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<Database['public']['Tables']['companies']['Row'], 'id' | 'created_at'>>;
        Relationships: never[];
      };
      clients: {
        Row: {
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
          status: 'active' | 'inactive';
          is_deleted: boolean;
          created_at: string;
          updated_at?: string | null;
          vehicle_assigned_at?: string | null;
          license_number: string;
          license_expiry: string;
          license_status: 'active' | 'expired';
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
        };
        Insert: Omit<Database['public']['Tables']['clients']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<Database['public']['Tables']['clients']['Row'], 'id' | 'created_at'>>;
        Relationships: [{ foreignKeyName: 'clients_assigned_vehicle_id_fkey', columns: ['assigned_vehicle_id'], isOneToOne: false, referencedRelation: 'vehicles', referencedColumns: ['id'] }];
      };
      vehicles: {
        Row: {
          id: string;
          alias: string;
          make: string;
          model: string;
          year: number;
          plate: string;
          serial_number: string;
          color: string;
          status: 'active' | 'inactive' | 'maintenance' | 'sold' | 'rented';
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
        };
        Insert: Omit<Database['public']['Tables']['vehicles']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<Database['public']['Tables']['vehicles']['Row'], 'id' | 'created_at'>>;
        Relationships: never[];
      };
      partners: {
        Row: {
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
        };
        Insert: Omit<Database['public']['Tables']['partners']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<Database['public']['Tables']['partners']['Row'], 'id' | 'created_at'>>;
        Relationships: never[];
      };
      mileage_logs: {
        Row: {
          id: string;
          uid?: string | null;
          vehicle_id: string;
          mileage: number;
          date: string;
          notes?: string | null;
          source?: 'expense' | 'manual' | null;
          financial_record_id?: string | null;
          kind?: 'odometer' | 'maintenance' | null;
          created_at: string;
          updated_at?: string | null;
          company_id?: string | null;
          is_deleted?: boolean | null;
          created_by?: string | null;
        };
        Insert: Omit<Database['public']['Tables']['mileage_logs']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<Database['public']['Tables']['mileage_logs']['Row'], 'id' | 'created_at'>>;
        Relationships: never[];
      };
      financial_records: {
        Row: {
          id: string;
          company_id?: string | null;
          client_id?: string | null;
          vehicle_id?: string | null;
          partner_id?: string | null;
          category_id: string;
          category: string;
          type: 'income' | 'expense' | 'payment';
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
          evidence_urls?: string[] | null;
          credit_payment_schedule_id?: string | null;
          mileage_at_expense?: number | null;
          notes?: string | null;
        };
        Insert: Omit<Database['public']['Tables']['financial_records']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<Database['public']['Tables']['financial_records']['Row'], 'id' | 'created_at'>>;
        Relationships: never[];
      };
      credits: {
        Row: {
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
          status: 'active' | 'completed' | 'defaulted' | 'inactive' | 'cancelled';
          is_deleted: boolean;
          created_at: string;
          updated_at?: string | null;
          company_id?: string | null;
          last_payment_date?: string | null;
          last_payment_amount?: number | null;
          last_payment_status?: 'paid' | 'overdue' | 'pending' | null;
        };
        Insert: Omit<Database['public']['Tables']['credits']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<Database['public']['Tables']['credits']['Row'], 'id' | 'created_at'>>;
        Relationships: never[];
      };
      notifications: {
        Row: {
          id: string;
          uid?: string | null;
          type: string;
          message: string;
          date: string;
          is_read: boolean;
          related_id?: string | null;
          read_at?: string | null;
          company_id?: string | null;
        };
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'>>;
        Relationships: never[];
      };
      vehicle_assignment_logs: {
        Row: {
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
        };
        Insert: Omit<Database['public']['Tables']['vehicle_assignment_logs']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<Database['public']['Tables']['vehicle_assignment_logs']['Row'], 'id' | 'created_at'>>;
        Relationships: never[];
      };
      financial_categories: {
        Row: {
          id: string;
          name: string;
          type: 'income' | 'expense' | 'payment';
          affects: 'client_balance' | 'partner_balance' | 'none' | 'security_deposit' | 'credit_payment' | 'credit_granted' | 'driver_payment';
          description?: string | null;
          is_default?: boolean | null;
          company_id?: string | null;
          category?: string | null;
        };
        Insert: Omit<Database['public']['Tables']['financial_categories']['Row'], 'id'> & { id?: string };
        Update: Partial<Omit<Database['public']['Tables']['financial_categories']['Row'], 'id'>>;
        Relationships: never[];
      };
      company_change_logs: {
        Row: {
          id: string;
          company_id: string;
          change_type: 'created' | 'updated' | 'deleted' | 'limit_changed' | 'contract_uploaded' | 'contract_deleted';
          changed_by: string;
          changed_by_name: string;
          changed_at: string;
          description: string;
          field_changed?: string | null;
          previous_value?: any | null;
          new_value?: any | null;
        };
        Insert: Omit<Database['public']['Tables']['company_change_logs']['Row'], 'id' | 'changed_at'> & { id?: string };
        Update: Partial<Omit<Database['public']['Tables']['company_change_logs']['Row'], 'id' | 'changed_at'>>;
        Relationships: never[];
      };
      client_change_logs: {
        Row: {
          id: string;
          client_id: string;
          change_type: 'created' | 'updated' | 'deleted' | 'vehicle_assigned' | 'vehicle_unassigned' | 'balance_updated' | 'deposit_updated' | 'document_uploaded' | 'credit_approved';
          changed_by: string;
          changed_by_name: string;
          changed_at: string;
          description: string;
          field_changed?: string | null;
          previous_value?: any | null;
          new_value?: any | null;
        };
        Insert: Omit<Database['public']['Tables']['client_change_logs']['Row'], 'id' | 'changed_at'> & { id?: string };
        Update: Partial<Omit<Database['public']['Tables']['client_change_logs']['Row'], 'id' | 'changed_at'>>;
        Relationships: never[];
      };
      message_templates: {
        Row: {
          id: string;
          name: string;
          content: string;
          type: 'cliente' | 'socio' | 'usuario';
          company_id: string;
          created_at: string;
          updated_at: string;
          is_deleted: boolean;
        };
        Insert: Omit<Database['public']['Tables']['message_templates']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Omit<Database['public']['Tables']['message_templates']['Row'], 'id' | 'created_at' | 'updated_at'>>;
        Relationships: never[];
      };
      message_logs: {
        Row: {
          id: string;
          recipient_id: string;
          recipient_name: string;
          recipient_type: 'cliente' | 'socio' | 'usuario';
          content: string;
          status: 'sent' | 'delivered' | 'failed';
          sent_by: string;
          sent_at: string;
          company_id: string;
        };
        Insert: Omit<Database['public']['Tables']['message_logs']['Row'], 'id' | 'sent_at'> & { id?: string };
        Update: Partial<Omit<Database['public']['Tables']['message_logs']['Row'], 'id' | 'sent_at'>>;
        Relationships: never[];
      };
      credit_payment_schedules: {
        Row: {
          id: string;
          credit_id: string;
          payment_number: number;
          due_date: string;
          amount: number;
          status: 'pending' | 'paid' | 'overdue' | 'cancelled';
          paid_amount?: number | null;
          paid_date?: string | null;
          company_id?: string | null;
          is_deleted?: boolean | null;
          deleted_at?: string | null;
          cancelled_at?: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['credit_payment_schedules']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<Database['public']['Tables']['credit_payment_schedules']['Row'], 'id' | 'created_at'>>;
        Relationships: never[];
      };
      multas: {
        Row: {
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
          status: 'pendiente' | 'pagada' | 'en_proceso' | 'cancelada';
          fecha_pago?: string | null;
          evidencia_urls?: string[] | null;
          notas?: string | null;
          asignado_automaticamente: boolean;
          assignment_date?: string | null;
          company_id: string;
          created_by: string;
          created_at: string;
          updated_at?: string | null;
          is_deleted: boolean;
        };
        Insert: Omit<Database['public']['Tables']['multas']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<Database['public']['Tables']['multas']['Row'], 'id' | 'created_at'>>;
        Relationships: never[];
      };
      fcm_tokens: {
        Row: {
          id: string;
          user_id: string;
          token: string;
          created_at: string;
          updated_at?: string | null;
        };
        Insert: Omit<Database['public']['Tables']['fcm_tokens']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<Database['public']['Tables']['fcm_tokens']['Row'], 'id' | 'created_at'>>;
        Relationships: never[];
      };
      audit_logs: {
        Row: {
          id: string;
          action: 'create' | 'update' | 'delete' | 'login' | 'logout';
          entity_type: string;
          entity_id: string;
          entity_name?: string | null;
          user_id: string;
          user_name?: string | null;
          timestamp: string;
          changes?: Record<string, any> | null;
          company_id?: string | null;
        };
        Insert: Omit<Database['public']['Tables']['audit_logs']['Row'], 'id' | 'timestamp'> & { id?: string };
        Update: Partial<Omit<Database['public']['Tables']['audit_logs']['Row'], 'id'>>;
        Relationships: never[];
      };
      documents: {
        Row: {
          id: string;
          entity_type: 'vehicle' | 'client' | 'partner' | 'company';
          entity_id: string;
          document_type: string;
          file_url: string;
          file_name: string;
          uploaded_by: string;
          uploaded_at: string;
          company_id?: string | null;
          is_deleted?: boolean | null;
        };
        Insert: Omit<Database['public']['Tables']['documents']['Row'], 'id' | 'uploaded_at'> & { id?: string };
        Update: Partial<Omit<Database['public']['Tables']['documents']['Row'], 'id' | 'uploaded_at'>>;
        Relationships: never[];
      };
      gps_configs: {
        Row: {
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
        };
        Insert: Omit<Database['public']['Tables']['gps_configs']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<Database['public']['Tables']['gps_configs']['Row'], 'id' | 'created_at'>>;
        Relationships: never[];
      };
      seguimientos: {
        Row: {
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
        };
        Insert: Omit<Database['public']['Tables']['seguimientos']['Row'], 'id' | 'timestamp'> & { id?: string };
        Update: Partial<Omit<Database['public']['Tables']['seguimientos']['Row'], 'id'>>;
        Relationships: never[];
      };
      plans: {
        Row: {
          id: string;
          name: string;
          display_name: string;
          description?: string | null;
          price_monthly: number;
          price_yearly: number;
          max_users: number;
          max_vehicles: number;
          max_companies: number;
          features?: Record<string, any> | null;
          is_active: boolean;
          created_at: string;
          updated_at?: string | null;
        };
        Insert: Omit<Database['public']['Tables']['plans']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<Database['public']['Tables']['plans']['Row'], 'id' | 'created_at'>>;
        Relationships: never[];
      };
      user_invitations: {
        Row: {
          id: string;
          company_id: string;
          email: string;
          role: string;
          invited_by: string;
          invited_by_name: string;
          status: string;
          token: string;
          expires_at: string;
          accepted_at?: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_invitations']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<Database['public']['Tables']['user_invitations']['Row'], 'id' | 'created_at'>>;
        Relationships: never[];
      };
plan_limit_logs: {
        Row: {
          id: string;
          company_id: string;
          user_id?: string | null;
          limit_type: string;
          limit_value?: number | null;
          current_value?: number | null;
          action: string;
          message?: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['plan_limit_logs']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<Database['public']['Tables']['plan_limit_logs']['Row'], 'id' | 'created_at'>>;
        Relationships: never[];
      };
      vehicle_inspections: {
        Row: {
          id: string;
          vehicle_id: string;
          client_id: string;
          company_id: string;
          photos: Record<string, string>;
          timestamp: string;
          expires_at: string;
          created_by: string;
          created_at: string;
          updated_at?: string | null;
        };
        Insert: Omit<Database['public']['Tables']['vehicle_inspections']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<Database['public']['Tables']['vehicle_inspections']['Row'], 'id' | 'created_at'>>;
        Relationships: never[];
      };
      generated_reports: {
        Row: {
          id: string;
          company_id: string;
          type: string;
          format: string;
          filename: string;
          date_range: Record<string, string> | null;
          created_by: string;
          created_by_name: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['generated_reports']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<Database['public']['Tables']['generated_reports']['Row'], 'id' | 'created_at'>>;
        Relationships: never[];
      };
      user_dashboards: {
        Row: {
          id: string;
          user_id: string;
          widgets: Record<string, any>;
          layout: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_dashboards']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<Database['public']['Tables']['user_dashboards']['Row'], 'id' | 'created_at'>>;
        Relationships: never[];
      };
      fcm_tokens: {
        Row: {
          id: string;
          user_id: string;
          token: string;
          created_at: string;
          updated_at?: string | null;
        };
        Insert: Omit<Database['public']['Tables']['fcm_tokens']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<Database['public']['Tables']['fcm_tokens']['Row'], 'id' | 'created_at'>>;
        Relationships: never[];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Crear cliente de Supabase
export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl!,
  supabaseAnonKey!,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  }
);

// Helper para obtener el usuario actual
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return null;
  }
  return user;
};

// Helper para obtener el perfil del usuario
export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .eq('is_deleted', false)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  return data;
};

// Exportar tipos útiles
export type Tables = Database['public']['Tables'];
export type User = Tables['users']['Row'];
export type Company = Tables['companies']['Row'];
export type Client = Tables['clients']['Row'];
export type Vehicle = Tables['vehicles']['Row'];
export type Partner = Tables['partners']['Row'];
export type MileageLog = Tables['mileage_logs']['Row'];
export type FinancialRecord = Tables['financial_records']['Row'];
export type Credit = Tables['credits']['Row'];
export type Notification = Tables['notifications']['Row'];
export type VehicleAssignmentLog = Tables['vehicle_assignment_logs']['Row'];
export type FinancialCategory = Tables['financial_categories']['Row'];
export type CompanyChangeLog = Tables['company_change_logs']['Row'];
export type ClientChangeLog = Tables['client_change_logs']['Row'];
export type MessageTemplate = Tables['message_templates']['Row'];
export type MessageLog = Tables['message_logs']['Row'];
export type CreditPaymentSchedule = Tables['credit_payment_schedules']['Row'];
export type Multa = Tables['multas']['Row'];
export type FcmToken = Tables['fcm_tokens']['Row'];
export type AuditLog = Tables['audit_logs']['Row'];
export type Document = Tables['documents']['Row'];
export type GpsConfig = Tables['gps_configs']['Row'];
export type Seguimiento = Tables['seguimientos']['Row'];
export type Plan = Tables['plans']['Row'];
export type UserInvitation = Tables['user_invitations']['Row'];
export type PlanLimitLog = Tables['plan_limit_logs']['Row'];
export type VehicleInspection = Tables['vehicle_inspections']['Row'];
export type GeneratedReport = Tables['generated_reports']['Row'];
export type UserDashboard = Tables['user_dashboards']['Row'];

