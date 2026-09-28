/**
 * @fileoverview Alias del Data Provider de Supabase (compatibilidad)
 * Mantiene los mismos exports que el provider original de Firebase.
 */
export {
  DataProvider,
  useData,
  DataContext,
  CREDIT_GRANTED_CATEGORY,
  CREDIT_PAYMENT_CATEGORY,
  CLIENT_PAYMENT_CATEGORY,
  DRIVER_PAYMENT_CATEGORY,
  MAINTENANCE_CATEGORY,
  SECURITY_DEPOSIT_CATEGORY,
  CLIENT_SECURITY_DEPOSIT_CATEGORY_ID,
  PARTNER_PAYMENT_CATEGORY_NAME,
  PARTNER_PAYMENT_CATEGORY_ID,
} from './data-provider-supabase';

export {
  calculatePartnerBalance,
  calculatePartnerBalanceBreakdown,
  getPartnerFinancialRecords,
} from '@/lib/financial-metrics';

export type { DataContextType } from './data-provider-supabase';
