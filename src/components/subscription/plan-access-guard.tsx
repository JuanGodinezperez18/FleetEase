"use client";

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowUpRight, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-provider';
import { isRouteAvailable } from '@/config/feature-flags';
import { plans, type PlanType } from '@/config/plans';

const PROTECTED_ROUTES: Record<string, { feature: string; label: string }> = {
  '/dashboard/profitability': { feature: 'profitability', label: 'Rentabilidad y análisis avanzado' },
  '/dashboard/users': { feature: 'multi_user', label: 'Gestión de múltiples usuarios' },
};

function normalizePath(pathname: string) {
  const exact = pathname.replace(/\\/$/, '') || '/';
  return exact;
}

export function PlanAccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = normalizePath(usePathname());
  const router = useRouter();
  const { currentUser } = useAuth();
  const [plan, setPlan] = useState<PlanType>('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadPlan = async () => {
      try {
        const response = await fetch('/api/stripe/status', { cache: 'no-store' });
        const data = await response.json().catch(() => ({}));
        const nextPlan: PlanType = data.success && data.plan in plans ? data.plan : 'free';
        if (!cancelled) setPlan(nextPlan);
      } catch {
        if (!cancelled) setPlan('free');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadPlan();
    return () => { cancelled = true; };
  }, [pathname]);

  if (loading) return <>{children}</>;
  if (currentUser?.role === 'superAdmin') return <>{children}</>;

  const protectedRoute = PROTECTED_ROUTES[pathname];
  if (!protectedRoute || isRouteAvailable(plan, pathname)) return <>{children}</>;

  return (
    <div className="flex min-h-[55vh] items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0e1117] p-7 text-center shadow-2xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-[#d7ff3f]/20 bg-[#d7ff3f]/[0.08] text-[#d7ff3f]">
          <LockKeyhole className="h-5 w-5" />
        </div>
        <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">Función de tu plan</p>
        <h1 className="mt-2 text-xl font-semibold text-white">{protectedRoute.label}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/45">
          Esta función requiere Pro o Enterprise. Tu plan actual es <strong className="text-white/70">{plans[plan].name}</strong>.
        </p>
        <Button
          className="mt-6 h-11 rounded-xl bg-[#d7ff3f] px-5 text-xs font-semibold text-black hover:bg-[#c8f02e]"
          onClick={() => router.push('/dashboard/settings/subscription')}
        >
          Ver planes y actualizar
          <ArrowUpRight className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
