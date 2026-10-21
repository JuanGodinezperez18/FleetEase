export interface AdminActor {
  id: string;
  role: string;
  company_id: string | null;
}

export interface TargetUser {
  id: string;
  role: string;
  company_id: string | null;
}

/**
 * Only a super admin may administer a super-admin account.
 * Company admins may administer users only within their own non-null company.
 */
export function canAdministerTargetUser(actor: AdminActor, target: TargetUser): boolean {
  if (actor.id === target.id) return false;
  if (target.role === 'super_admin') return actor.role === 'super_admin';
  if (actor.role === 'super_admin') return true;
  return Boolean(actor.company_id && target.company_id && actor.company_id === target.company_id);
}
