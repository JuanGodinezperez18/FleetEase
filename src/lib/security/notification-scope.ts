export interface ScopedRecipient {
  id: string;
  company_id: string | null;
  is_deleted?: boolean | null;
}

/**
 * Fail-closed guard for notification recipient IDs returned by a company-scoped
 * users query. The requested IDs must all exist, be active, and belong to the
 * requested company; duplicates in the request are normalized.
 */
export function hasCompanyScopedRecipients(
  requestedIds: string[],
  records: ScopedRecipient[],
  companyId: string,
): boolean {
  const requested = [...new Set(requestedIds)];
  if (requested.length === 0 || !companyId) return false;

  const scopedIds = new Set(
    records
      .filter(record => record.company_id === companyId && record.is_deleted !== true)
      .map(record => record.id),
  );

  return requested.every(id => scopedIds.has(id));
}
