  writeOffReason?: string | null;
  writtenOffAt?: string | null;
  writtenOffBy?: string | null;
}

export interface ClientWithMetrics extends Omit<Client, 'licenseStatus'> {
  licenseStatus?: 'active' | 'expired' | 'Vigente' | 'Próxima a Vencer' | 'Vencida' | 'N/A';
  totalPayments?: number;
  lastPaymentDate?: string;
  daysWithDebt?: number;
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
  balance?: number;
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
  kind?: 'odometer' | 'maintenance';
  financialRecordId?: string;
  createdAt: string;
  updatedAt?: string;
  companyId?: string | null;
  isDeleted?: boolean;
}

export interface FinancialRecordItem {
  catalogItemId?: string | null;
  concept: string;
  amount: number;
  supplierId?: string | null;
  supplierName?: string | null;
  partNumber?: string | null;
  warrantyDays?: number | null;
  warrantyExpiresAt?: string | null;
  vehicleId?: string | null;
}

export interface FinancialRecord {
  id: string;
  referenceCode?: string;
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
  multaId?: string;
  notes?: string;
  sourceRecordId?: string | null;
  sourceRecordType?: string | null;
  relatedRecordId?: string | null;
  relatedRecordType?: string | null;
  items?: FinancialRecordItem[] | null;
}

export interface Credit {
  id: string;
  referenceCode?: string;
  uid?: string;
  clientId: string;
  vehicleId: string;
  totalAmount: number;
  paidAmount: number;
  remainingBalance: number;
  weeklyPayment: number;
  numberOfPayments: number;