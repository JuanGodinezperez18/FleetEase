

import type { Timestamp } from 'firebase/firestore';

export interface Vehicle {
  id: string;
  alias: string;
  make: string;
  model: string;
  year: number;
  plate: string;
  serialNumber: string;
  color: string;
  status: 'active' | 'inactive' | 'maintenance' | 'sold' | 'rented';
  clientId: string | null; // ID del cliente al que está asignado
  partnerId: string | null; // ID del socio propietario
  cost?: number; // Costo de adquisición
  weeklyRentalValue?: number; // Valor de renta por semana
  acquisitionDate: string; // Fecha de adquisición
  // ... otros campos
  maintenanceInterval?: number; // ✅ AGREGAR ESTE CAMPO (en km)
  lastMaintenanceMileage?: number; // Kilometraje del último mantenimiento
  currentMileage: number;
  insuranceCompany?: string;
  insurancePolicyNumber?: string;
  insuranceExpiryDate?: string;
  adminCommission?: number; // Comisión de administración
  isDeleted: boolean;
  createdAt: string;
  updatedAt?: string;
  companyId?: string;
  imageUrl?: string | File;
  circulationCardUrl?: string | File;
  insurancePolicyDocumentUrl?: string | File;
  gpsPhoneNumber?: string;
  gpsPhoneCompany?: string;
  lockedByCredit?: boolean;
  associatedCreditId?: string | null;
}

export interface VehicleWithMileage extends Vehicle {
  displayCurrentMileage: string;
  displayLastMaintMileage: string;
  displayNextMaintDueAt: string;
  displayKmToNextMaintenance: string;
  kmToNextMaintenance?: number;
  dailyAveragekm: number;
}

export interface Client {
  id: string;
  userId?: string;
  firstname: string;
  lastname: string;
  email?: string;
  phone: string;
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  status: 'active' | 'inactive';
  isDeleted: boolean;
  createdAt: string;
  updatedAt?: string;
  vehicleAssignedAt?: string; // ✅ Fecha de asignación de vehículo
  licenseNumber: string;
  licenseExpiry: string;
  licenseStatus: 'active' | 'expired'; // ✅ FIX: Solo estos dos
  initialBalance: number;
  balance: number;
  securityDeposit: number; // Depósito en garantía
  assignedVehicleId?: string | null;
  paymentBehavior?: 'Excelente' | 'Bueno' | 'Regular' | 'Malo' | 'Crítico';
  photoUrl?: string | File;
  ineUrl?: string | File;
  licenseImageUrl?: string | File;
  companyId?: string;
  hasActiveCredit?: boolean;
  activeCreditId?: string | null;
}

// ✅ TIPO EXTENDIDO CON MÉTRICAS (usado en tablas/dashboards)
export interface ClientWithMetrics extends Omit<Client, 'licenseStatus'> {
// Ya tiene balance heredado de Client
// Agrega campos adicionales si los necesitas
  licenseStatus?: 'active' | 'expired' | 'Vigente' | 'Próxima a Vencer' | 'Vencida' | 'N/A';
  totalPayments?: number;
  lastPaymentDate?: string;
  daysWithDebt?: number;
  // Propiedades adicionales de ClientMetric
  totalTransactions?: number;
  totalIncome?: number;
  currentBalance?: number;
  avgTransactionValue?: number;
  paymentFrequencyDays?: number | null;
  daysSinceLastPayment?: number | null;
  paymentBehavior?: 'Excelente' | 'Bueno' | 'Regular' | 'Malo' | 'Crítico';
  activityLevel?: 'Alto' | 'Medio' | 'Bajo' | 'Inactivo';
  daysUntilLicenseExpiry?: number | null;
  alerts?: string[];
  recommendations?: string[];
}

// ✅ TIPO PARA DATOS COMPLETOS DEL CLIENTE (con vehículo asignado)
export interface ClientWithAllData extends Client {
  vehicle?: Vehicle | null;
  assignedVehicle?: Vehicle | null;
}

export interface Partner {
  id: string;
  userId?: string;
  firstname: string;
  lastname: string;
  name: string;
  email?: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  initialBalance?: number;
  balance?: number; // Saldo actual del socio
  isDeleted: boolean;
  createdAt: string;
  updatedAt?: string;
  companyId?: string | null | undefined;
  vehicleLimit?: number | null;
}

export interface MileageLog {
  id: string;
  uid?: string;
  vehicleId: string;
  mileage: number;
  date: string;
  notes?: string;
  source?: 'expense' | 'manual';
  financialRecordId?: string;
  kind?: 'odometer' | 'maintenance';
  createdAt: string;
  updatedAt?: string;
  companyId?: string | null;
  isDeleted?: boolean;
  createdBy?: string;
}

export interface FinancialRecord {
  id: string;
  companyId?: string | null;
  clientId?: string | null;
  vehicleId?: string | null;
  partnerId?: string | null;
  categoryId: string;
  category: string;
  type: 'income' | 'expense' | 'payment';
  amount: number;
  paymentMethod?: string;
  description: string;
  date: string;
  creditId?: string;
  creditPayment?: boolean;
  creditGranted?: boolean;
  creditPaymentNumber?: number;
  isPending?: boolean;
  isDeleted: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
  evidenceUrls?: (string | File)[];
  creditPaymentScheduleId?: string;
  mileageAtExpense?: number;
  notes?: string;
}

export interface Credit {
  id: string;
  uid?: string;
  clientId: string;
  vehicleId: string;
  totalAmount: number; // Monto total del crédito
  paidAmount: number; // Monto ya pagado
  remainingBalance: number; // Saldo restante
  weeklyPayment: number; // Monto del pago semanal
  numberOfPayments: number; // Número total de pagos
  paymentsMade: number; // Número de pagos ya realizados
  startDate: string;
  status: 'active' | 'completed' | 'defaulted' | 'inactive' | 'cancelled';
  isDeleted: boolean;
  createdAt: string;
  updatedAt?: string;
  companyId?: string;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  lastPaymentStatus?: 'paid' | 'overdue' | 'pending'
}

export interface Notification {
  id: string;
  uid?: string;
  type: string;
  message: string;
  date: string;
  isRead: boolean;
  relatedId?: string; // ID de la entidad relacionada (vehículo, cliente, etc.)
  readAt?: string | null;
  companyId?: string;
}

export interface VehicleAssignmentLog {
  id: string;
  vehicleId: string;
  clientId: string | null;
  partnerId?: string | null;
  companyId?: string | null;  // ⬅️ Añade esta línea
  assignedAt: string;
  unassignedAt?: string | null;
  assignedBy: string;
  reason?: string;
  createdAt: string;
  //Alias para comparibilidad con analytics
  startDate?: string;
  endDate?: string | null;
}

export type UserRole = 'admin' | 'editor' | 'viewer' | 'superAdmin' | 'partner' | 'client';

export interface NotificationSettings {
    maintenance?: boolean;
    maintenanceThreshold?: number; // in km
    insurance?: boolean;
    insuranceThreshold?: number; // in days
    license?: boolean;
    licenseThreshold?: number; // in days
}

export interface UserProfile {
    uid: string;
    name: string;
    email: string;
    phone?: string;
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    role: UserRole;
    companyId?: string | null;
    partnerAccess?: string[];
    notificationSettings?: NotificationSettings;
    isDeleted: boolean;
    createdAt?: string;
    updatedAt?: string;
    pushSubscriptions?: any[];
}

export interface Company {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt?: string;
  // Nuevos campos de configuración
  defaultRentalDays?: number;
  maintenanceInterval?: number;
  latePaymentFee?: number;
  gracePeriodDays?: number;
  emailNotifications?: boolean;
  whatsappNotifications?: boolean;
  contractTemplateUrl?: string | null;
  vehicleLimit?: number | null;
  // Campos de plan de suscripción
  plan?: 'starter' | 'pro' | 'enterprise';
  maxVehicles?: number | null;
  maxUsers?: number | null;
}

export interface FinancialCategory {
  id: string;
  name: string;
  type: 'income' | 'expense' | 'payment';
  affects: 'client_balance' | 'partner_balance' | 'none';
  description?: string;
  isDefault?: boolean;
  companyId?: string | null;
  category?: string | null;
}

export interface ClientChangeLog {
  id: string;
  clientId: string;
  changeType: 'created' | 'updated' | 'deleted' | 'vehicle_assigned' | 'vehicle_unassigned' | 'balance_updated' | 'deposit_updated' | 'document_uploaded' | 'credit_approved';
  changedBy: string;
  changedByName: string;
  changedAt: string;
  description: string;
  fieldChanged?: string;
  previousValue?: any;
  newValue?: any;
}

export interface CompanyChangeLog {
  id: string;
  companyId: string;
  changeType: 'created' | 'updated' | 'deleted' | 'limit_changed' | 'contract_uploaded' | 'contract_deleted';
  changedBy: string;
  changedByName: string;
  changedAt: string;
  description: string;
  fieldChanged?: string;
  previousValue?: any;
  newValue?: any;
}

export interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  type: 'cliente' | 'socio' | 'usuario';
  companyId: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
}

export interface MessageLog {
  id: string;
  recipientId: string;
  recipientName: string;
  recipientType: 'cliente' | 'socio' | 'usuario';
  content: string;
  status: 'sent' | 'delivered' | 'failed';
  sentBy: string;
  sentAt: string;
  companyId: string;
}

export interface CreditPaymentSchedule {
  id: string;
  creditId: string;
  paymentNumber: number;
  dueDate: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paidAmount?: number;
  paidDate?: string;
  companyId?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  cancelledAt?: string;
  createdAt: string;
}

// ============ SISTEMA DE MULTAS ============

export interface Multa {
  id: string;
  vehicleId: string;
  clientId: string | null; // Cliente asignado basado en historial
  folio?: string; // Número de folio de la multa (opcional)
  fechaInfraccion: string; // Fecha cuando se cometió la infracción
  direccion: string; // Dirección donde se cometió la infracción
  descripcion: string; // Descripción de la infracción
  importe: number; // Monto de la multa
  recargos?: number; // Recargos adicionales
  total: number; // Total a pagar (importe + recargos)
  status: 'pendiente' | 'pagada' | 'en_proceso' | 'cancelada';
  fechaPago?: string; // Fecha cuando se pagó la multa
  evidenciaUrls?: (string | File)[]; // URLs de evidencias (fotos, documentos)
  notas?: string; // Notas adicionales
  asignadoAutomaticamente: boolean; // Si se asignó automáticamente basado en historial
  assignmentDate?: string; // Fecha cuando se encontró el vehículo en el historial
  companyId: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  isDeleted: boolean;
}

// Multa con información extendida para visualización
export interface MultaWithDetails extends Multa {
  vehiclePlate?: string;
  vehicleAlias?: string;
  clientName?: string;
  clientPhone?: string;
  daysOverdue?: number; // Días desde la infracción
}
