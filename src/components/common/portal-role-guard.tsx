'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-provider';
import { normalizeDatabaseUserRole } from '@/lib/roles';

export function PortalRoleGuard({ portal, children }: {
  portal: 'dashboard' | 'client' | 'partner';
  children: ReactNode;
}) {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const role = normalizeDatabaseUserRole(currentUser?.role);
  const home = role === 'client' ? '/client' : role === 'partner' ? '/partner'
    : role ? '/dashboard' : '/login';
  const allowed = Boolean(currentUser && home === `/${portal}`);

  useEffect(() => {
    if (!loading && !allowed) router.replace(home);
  }, [loading, allowed, home, router]);

  if (loading || !allowed) return null;
  return children;
}
