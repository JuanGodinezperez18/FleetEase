"use client";

// Finanzas y créditos
export const CREDIT_GRANTED_CATEGORY = 'Crédito Otorgado';
export const CLIENT_PAYMENT_CATEGORY = 'Abono de Cliente';
export const DRIVER_PAYMENT_CATEGORY = 'Pago a Conductor';
export const MAINTENANCE_CATEGORY = 'Mantenimiento';
// Nombre canónico de la categoría por defecto en Supabase.
export const SECURITY_DEPOSIT_CATEGORY = 'Depósito en Garantía';

// Las categorías especiales se identifican por semántica, nunca por IDs
// heredados de Firebase ni por UUIDs que cambian entre empresas.
export const PARTNER_PAYMENT_CATEGORY_NAME = 'Pago a Socio';

export function isPartnerPaymentCategory(category?: { type?: string; affects?: string } | null): boolean {
  return category?.type === 'payment' && category.affects === 'partner_balance';
}