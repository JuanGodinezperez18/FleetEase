import { DATABASE_USER_ROLES, isSuperAdminRole, normalizeDatabaseUserRole } from '@/lib/roles';

describe('canonical user roles', () => {
  it('matches the persisted Supabase role vocabulary', () => {
    expect(DATABASE_USER_ROLES).toEqual([
      'admin',
      'editor',
      'viewer',
      'super_admin',
      'partner',
      'client',
    ]);
  });

  it('normalizes the UI super-admin alias to the database spelling', () => {
    expect(normalizeDatabaseUserRole('superAdmin')).toBe('super_admin');
    expect(normalizeDatabaseUserRole('super_admin')).toBe('super_admin');
  });

  it('rejects role spellings that are not persisted roles', () => {
    expect(normalizeDatabaseUserRole('manager')).toBeNull();
    expect(normalizeDatabaseUserRole('user')).toBeNull();
    expect(normalizeDatabaseUserRole('driver')).toBeNull();
  });

  it('recognizes the super-admin alias at UI boundaries', () => {
    expect(isSuperAdminRole('superAdmin')).toBe(true);
    expect(isSuperAdminRole('super_admin')).toBe(true);
    expect(isSuperAdminRole('admin')).toBe(false);
  });
});
