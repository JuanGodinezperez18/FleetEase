/**
 * @fileoverview Servicios de datos para Supabase
 * 
 * Reemplaza a firestore-services.ts proporcionando una API similar
 * pero usando PostgreSQL en lugar de Firestore
 */

import { supabase, type Database } from '@/lib/supabase';
import type { 
  Client, Vehicle, MileageLog, FinancialRecord, Partner, 
  User as UserProfile, Credit, Notification, VehicleAssignmentLog, 
  Company, FinancialCategory, ClientChangeLog, CompanyChangeLog, 
  MessageTemplate, MessageLog, CreditPaymentSchedule, Multa,
  FcmToken, AuditLog, Document as DocumentRow, GpsConfig, Seguimiento,
  Insert, Update, QueryOptions 
} from '@/types/supabase';
import { logAudit } from '@/lib/audit';

// =====================================================
// CLASE BASE PARA SERVICIOS GENÉRICOS
// =====================================================

type TableName = keyof Database['public']['Tables'];

class SupabaseService<T extends { id: string; created_at?: string }, Name extends TableName = TableName> {
  protected tableName: Name;

  constructor(tableName: Name) {
    this.tableName = tableName;
  }

  /**
   * Crear un nuevo registro
   */
  async add(data: Omit<T, 'created_at'> & { id?: string }): Promise<T> {
    const { data: result, error } = await (supabase as any)
      .from(this.tableName)
      .insert(data as any)
      .select()
      .single();

    if (error) {
      console.error(`[Supabase] Error creating ${this.tableName}:`, error);
      throw error;
    }

    return result as T;
  }

  /**
   * Crear múltiples registros
   */
  async addMany(dataArray: Array<Omit<T, 'created_at'> & { id?: string }>): Promise<T[]> {
    const { data: result, error } = await (supabase as any)
      .from(this.tableName)
      .insert(dataArray as any)
      .select();

    if (error) {
      console.error(`[Supabase] Error creating multiple ${this.tableName}:`, error);
      throw error;
    }

    return result as T[];
  }

  /**
   * Actualizar un registro
   */
  async update(id: string, data: Partial<Omit<T, 'id' | 'created_at'>>): Promise<void> {
    const { error } = await (supabase as any)
      .from(this.tableName)
      .update(data as any)
      .eq('id', id);

    if (error) {
      console.error(`[Supabase] Error updating ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Obtener un registro por ID
   */
  async get(id: string): Promise<T | null> {
    const { data, error } = await (supabase as any)
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return data as T;
  }

  /**
   * Obtener todos los registros con opciones de consulta
   */
  async getAll(options?: QueryOptions<T>): Promise<T[]> {
    let query = (supabase as any).from(this.tableName).select('*');

    if (options?.filters?.eq) {
      Object.entries(options.filters.eq).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    if (options?.orderBy) {
      query = query.order(options.orderBy as string, { 
        ascending: options.order !== 'desc' 
      });
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error(`[Supabase] Error getting all ${this.tableName}:`, error);
      throw error;
    }

    return data as T[];
  }

  /**
   * Obtener registros filtrados
   */
  async findMany(filters: Partial<Record<keyof T, any>>): Promise<T[]> {
    let query = (supabase as any).from(this.tableName).select('*');

    Object.entries(filters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        query = query.in(key, value);
      } else {
        query = query.eq(key, value);
      }
    });

    const { data, error } = await query;

    if (error) {
      console.error(`[Supabase] Error finding ${this.tableName}:`, error);
      throw error;
    }

    return data as T[];
  }

  /**
   * Soft delete (marcar como eliminado)
   */
  async softDelete(id: string): Promise<void> {
    await this.update(id, { is_deleted: true } as any);
  }

  /**
   * Hard delete (eliminar permanentemente)
   */
  async hardDelete(id: string): Promise<void> {
    const { error } = await (supabase as any)
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`[Supabase] Error deleting ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Contar registros
   */
  async count(filters?: Partial<Record<keyof T, any>>): Promise<number> {
    let query = (supabase as any).from(this.tableName).select('*', { count: 'exact', head: true });

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    const { count, error } = await query;

    if (error) {
      console.error(`[Supabase] Error counting ${this.tableName}:`, error);
      throw error;
    }

    return count || 0;
  }
}

// =====================================================
// SERVICIOS ESPECÍFICOS
// =====================================================

class CompanyService extends SupabaseService<Company, 'companies'> {
  constructor() {
    super('companies');
  }

  async add(data: Omit<Company, 'id' | 'created_at' | 'is_deleted'>): Promise<Company> {
    const { data: result, error } = await (supabase as any)
      .from(this.tableName)
      .insert({ ...data, is_deleted: false })
      .select()
      .single();

    if (error) {
      console.error('[Supabase] Error creating company:', error);
      throw error;
    }

    // Log de auditoría
    try {
      await logAudit('create', 'company', result.id, result.name, result);
    } catch (auditError) {
      console.warn('Failed to log audit for company creation:', auditError);
    }

    return result;
  }

  async update(id: string, data: Partial<Company>): Promise<void> {
    // Obtener documento actual para auditoría
    const currentDoc = await this.get(id);
    
    await super.update(id, data);

    // Log de auditoría
    try {
      await logAudit('update', 'company', id, data.name || currentDoc?.name, data);
    } catch (auditError) {
      console.warn('Failed to log audit for company update:', auditError);
    }
  }

  async softDelete(id: string): Promise<void> {
    const currentDoc = await this.get(id);
    
    await super.softDelete(id);

    // Log de auditoría
    try {
      await logAudit('delete', 'company', id, currentDoc?.name);
    } catch (auditError) {
      console.warn('Failed to log audit for company delete:', auditError);
    }
  }
}

class ClientService extends SupabaseService<Client, 'clients'> {
  constructor() {
    super('clients');
  }

  async getWithVehicle(clientId: string): Promise<Client & { vehicle?: Vehicle | null }> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select(`
        *,
        vehicle:assigned_vehicle_id (
          id,
          alias,
          plate,
          make,
          model,
          year,
          status
        )
      `)
      .eq('id', clientId)
      .single();

    if (error || !data) {
      throw error || new Error('Client not found');
    }

    return {
      ...data,
      vehicle: (data.vehicle || null) as Vehicle | null
    };
  }

  async getByCompany(companyId: string, options?: QueryOptions<Client>): Promise<Client[]> {
    let query = supabase
      .from(this.tableName)
      .select('*')
      .eq('company_id', companyId)
      .eq('is_deleted', false);

    if (options?.orderBy) {
      query = query.order(options.orderBy as string, { 
        ascending: options.order !== 'desc' 
      });
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Supabase] Error getting clients by company:', error);
      throw error;
    }

    return data || [];
  }
}

class VehicleService extends SupabaseService<Vehicle, 'vehicles'> {
  constructor() {
    super('vehicles');
  }

  async getByCompany(companyId: string, options?: QueryOptions<Vehicle>): Promise<Vehicle[]> {
    let query = supabase
      .from(this.tableName)
      .select('*')
      .eq('company_id', companyId)
      .eq('is_deleted', false);

    if (options?.orderBy) {
      query = query.order(options.orderBy as string, { 
        ascending: options.order !== 'desc' 
      });
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Supabase] Error getting vehicles by company:', error);
      throw error;
    }

    return data || [];
  }

  async getByPlate(plate: string): Promise<Vehicle | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('plate', plate)
      .eq('is_deleted', false)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }
}

class FinancialRecordService extends SupabaseService<FinancialRecord, 'financial_records'> {
  constructor() {
    super('financial_records');
  }

  async getByClient(clientId: string): Promise<FinancialRecord[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('client_id', clientId)
      .eq('is_deleted', false)
      .order('date', { ascending: false });

    if (error) {
      console.error('[Supabase] Error getting financial records by client:', error);
      throw error;
    }

    return data || [];
  }

  async getByVehicle(vehicleId: string): Promise<FinancialRecord[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('vehicle_id', vehicleId)
      .eq('is_deleted', false)
      .order('date', { ascending: false });

    if (error) {
      console.error('[Supabase] Error getting financial records by vehicle:', error);
      throw error;
    }

    return data || [];
  }
}

class MileageLogService extends SupabaseService<MileageLog, 'mileage_logs'> {
  constructor() {
    super('mileage_logs');
  }

  async getByVehicle(vehicleId: string, limit: number = 100): Promise<MileageLog[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('vehicle_id', vehicleId)
      .eq('is_deleted', false)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[Supabase] Error getting mileage logs by vehicle:', error);
      throw error;
    }

    return data || [];
  }

  async getLatestByVehicle(vehicleId: string): Promise<MileageLog | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('vehicle_id', vehicleId)
      .eq('is_deleted', false)
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }
}

class CreditService extends SupabaseService<Credit, 'credits'> {
  constructor() {
    super('credits');
  }

  async getByClient(clientId: string): Promise<Credit[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('client_id', clientId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Supabase] Error getting credits by client:', error);
      throw error;
    }

    return data || [];
  }

  async getActiveByClient(clientId: string): Promise<Credit | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('client_id', clientId)
      .eq('is_deleted', false)
      .in('status', ['active', 'completed'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }
}

class NotificationService extends SupabaseService<Notification, 'notifications'> {
  constructor() {
    super('notifications');
  }

  async getByUser(userId: string, unreadOnly: boolean = false): Promise<Notification[]> {
    let query = supabase
      .from(this.tableName)
      .select('*')
      .order('date', { ascending: false });

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Supabase] Error getting notifications:', error);
      throw error;
    }

    return data || [];
  }

  async markAsRead(notificationId: string): Promise<void> {
    await this.update(notificationId, { 
      is_read: true, 
      read_at: new Date().toISOString() 
    });
  }

  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('uid', userId)
      .eq('is_read', false);

    if (error) {
      console.error('[Supabase] Error marking all notifications as read:', error);
      throw error;
    }
  }
}

class MultaService extends SupabaseService<Multa, 'multas'> {
  constructor() {
    super('multas');
  }

  async getByVehicle(vehicleId: string): Promise<Multa[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('vehicle_id', vehicleId)
      .eq('is_deleted', false)
      .order('fecha_infraccion', { ascending: false });

    if (error) {
      console.error('[Supabase] Error getting multas by vehicle:', error);
      throw error;
    }

    return data || [];
  }

  async getByStatus(status: Multa['status']): Promise<Multa[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('status', status)
      .eq('is_deleted', false)
      .order('fecha_infraccion', { ascending: false });

    if (error) {
      console.error('[Supabase] Error getting multas by status:', error);
      throw error;
    }

    return data || [];
  }
}

class UserService extends SupabaseService<UserProfile, 'users'> {
  constructor() {
    super('users');
  }

  async getByEmail(email: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('email', email)
      .eq('is_deleted', false)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }

  async getByCompany(companyId: string): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('company_id', companyId)
      .eq('is_deleted', false)
      .order('name', { ascending: true });

    if (error) {
      console.error('[Supabase] Error getting users by company:', error);
      throw error;
    }

    return data || [];
  }
}

// =====================================================
// EXPORTAR INSTANCIAS DE SERVICIOS
// =====================================================

export const companyService = new CompanyService();
export const clientService = new ClientService();
export const vehicleService = new VehicleService();
export const mileageLogService = new MileageLogService();
export const financialRecordService = new FinancialRecordService();
export const partnerService = new SupabaseService<Partner, 'partners'>('partners');
export const userService = new UserService();
export const creditService = new CreditService();
export const notificationService = new NotificationService();
export const vehicleAssignmentLogService = new SupabaseService<VehicleAssignmentLog, 'vehicle_assignment_logs'>('vehicle_assignment_logs');
export const financialCategoryService = new SupabaseService<FinancialCategory, 'financial_categories'>('financial_categories');
export const companyChangeLogService = new SupabaseService<CompanyChangeLog, 'company_change_logs'>('company_change_logs');
export const clientChangeLogService = new SupabaseService<ClientChangeLog, 'client_change_logs'>('client_change_logs');
export const messageTemplateService = new SupabaseService<MessageTemplate, 'message_templates'>('message_templates');
export const messageLogService = new SupabaseService<MessageLog, 'message_logs'>('message_logs');
export const creditPaymentScheduleService = new SupabaseService<CreditPaymentSchedule, 'credit_payment_schedules'>('credit_payment_schedules');
export const multaService = new MultaService();
export const fcmTokenService = new SupabaseService<FcmToken, 'fcm_tokens'>('fcm_tokens');
export const auditLogService = new SupabaseService<AuditLog, 'audit_logs'>('audit_logs');
export const documentService = new SupabaseService<DocumentRow, 'documents'>('documents');
export const gpsConfigService = new SupabaseService<GpsConfig, 'gps_configs'>('gps_configs');
export const seguimientoService = new SupabaseService<Seguimiento, 'seguimientos'>('seguimientos');

// Exportar supabase para consultas personalizadas
export { supabase };

