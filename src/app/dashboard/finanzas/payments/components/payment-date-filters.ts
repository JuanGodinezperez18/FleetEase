/**
 * Filtros de fecha para el formulario de pagos.
 * Evita registrar pagos sobre facturas/entidades que aún no existían
 * en la fecha seleccionada.
 */
export function paymentDateKey(date: string | null | undefined): string {
  return String(date || "").slice(0, 10);
}

export function entityExistedOnDate(createdAt: string | null | undefined, date: string): boolean {
  const key = paymentDateKey(date);
  if (!key) return true;
  if (!createdAt) return false;
  return String(createdAt).slice(0, 10) <= key;
}

export function recordDateOnOrBefore(recordDate: string | null | undefined, date: string): boolean {
  const key = paymentDateKey(date);
  if (!key) return true;
  const rd = String(recordDate || "").slice(0, 10);
  return !!rd && rd <= key;
}
