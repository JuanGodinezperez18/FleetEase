/**
 * Canonical role vocabulary shared by database types, API validation and UI.
 * The UI keeps the historical "superAdmin" alias at its boundary; persisted
 * Supabase rows always use "super_admin".
 */
export const DATABASE_USER_ROLES = [
  'admin',
  'editor',
  'viewer',
  'super_admin',
  'partner',
  'client',
] as const;

export type DatabaseUserRole = (typeof DATABASE_USER_ROLES)[number];
export type AppUserRole = Exclude<DatabaseUserRole, 'super_admin'> | 'superAdmin';

export function normalizeDatabaseUserRole(
  role: string | null | undefined,
): DatabaseUserRole | null {
  if (role === 'superAdmin') return 'super_admin';
  return DATABASE_USER_ROLES.includes(role as DatabaseUserRole)
    ? (role as DatabaseUserRole)
    : null;
}

export function isSuperAdminRole(role: string | null | undefined): boolean {
  return role === 'super_admin' || role === 'superAdmin';
}
