import { canAccessTargetCompany, canAdministerTargetUser } from './admin-target-scope';

const superAdmin = { id: 'root', role: 'super_admin', company_id: null };
const companyAdmin = { id: 'admin-a', role: 'admin', company_id: 'company-a' };
const userA = { id: 'user-a', role: 'viewer', company_id: 'company-a' };
const userB = { id: 'user-b', role: 'admin', company_id: 'company-b' };
const orphanUser = { id: 'orphan', role: 'admin', company_id: null };
const otherSuperAdmin = { id: 'root-2', role: 'super_admin', company_id: null };

describe('canAdministerTargetUser', () => {
  it('allows a company admin to administer a user in the same company', () => {
    expect(canAdministerTargetUser(companyAdmin, userA)).toBe(true);
  });

  it('blocks a company admin from another company', () => {
    expect(canAdministerTargetUser(companyAdmin, userB)).toBe(false);
  });

  it('blocks a company admin from a target without a company', () => {
    expect(canAdministerTargetUser(companyAdmin, orphanUser)).toBe(false);
  });

  it('blocks a company admin from resetting a super-admin password', () => {
    expect(canAdministerTargetUser(companyAdmin, otherSuperAdmin)).toBe(false);
  });

  it('allows a super-admin to administer users across companies', () => {
    expect(canAdministerTargetUser(superAdmin, userB)).toBe(true);
  });

  it('allows a super-admin to administer another super-admin', () => {
    expect(canAdministerTargetUser(superAdmin, otherSuperAdmin)).toBe(true);
  });

  it('blocks self-targeting in the shared policy', () => {
    expect(canAdministerTargetUser(companyAdmin, companyAdmin)).toBe(false);
  });
});

describe('canAccessTargetCompany', () => {
  it('allows a company admin only for its own explicit company', () => {
    expect(canAccessTargetCompany(companyAdmin, 'company-a', true)).toBe(true);
    expect(canAccessTargetCompany(companyAdmin, 'company-b', true)).toBe(false);
  });

  it('fails closed when an explicit target company is null', () => {
    expect(canAccessTargetCompany(companyAdmin, null, true)).toBe(false);
  });

  it('allows a company admin without target scoping only when route does not specify a target', () => {
    expect(canAccessTargetCompany(companyAdmin, null, false)).toBe(true);
  });

  it('allows super-admin target operations across tenants', () => {
    expect(canAccessTargetCompany(superAdmin, null, true)).toBe(true);
  });
});
