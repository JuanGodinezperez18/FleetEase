"use client";

// Finanzas y créditos
export const CREDIT_GRANTED_CATEGORY = 'Crédito Otorgado';
export const CREDIT_PAYMENT_CATEGORY = 'vKeQhlbdBmZhPw8ZmJEX';
export const CLIENT_PAYMENT_CATEGORY = 'Abono de Cliente';
export const DRIVER_PAYMENT_CATEGORY = 'Pago a Conductor';
export const MAINTENANCE_CATEGORY = 'Mantenimiento';
// Nombre canónico de la categoría por defecto en Supabase.
export const SECURITY_DEPOSIT_CATEGORY = 'Depósito en Garantía';
// ID legado conservado únicamente por compatibilidad; las nuevas reglas deben
// resolver la categoría por `affects = security_deposit`.
export const CLIENT_SECURITY_DEPOSIT_CATEGORY_ID = '66NXhL4RKMnc65R5GcKQ';

// Pagos a socio
export const PARTNER_PAYMENT_CATEGORY_NAME = 'Pago a Socio';
export let PARTNER_PAYMENT_CATEGORY_ID: string | undefined;

export const setPartnerPaymentCategoryId = (id?: string) => {
  PARTNER_PAYMENT_CATEGORY_ID = id;
};