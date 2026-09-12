import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import type { PlanType } from '@/config/plans';
import { getSafeExternalUrl } from '@/lib/security/safe-url';

export interface SubscriptionStatus {
  plan: PlanType;
  maxVehicles: number;
  maxUsers: number;
  currentPeriodEnd?: string;
  vehicleCount: number;
  subscription: { status: string; currentPeriodEnd: string; cancelAtPeriodEnd: boolean; } | null;
}

export function useSubscription() {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);

  const fetchSubscriptionStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/stripe/status');
      if (!res.ok) throw new Error(`Error ${res.status} obteniendo estado`);
      const data = await res.json();
      if (data.success) setSubscription(data);
    } catch (error: any) {
      console.error('Error fetching subscription status:', error);
      setSubscription({ plan: 'starter', maxVehicles: 5, maxUsers: 1, vehicleCount: 0, subscription: null });
    } finally { setLoading(false); }
  }, []);

  const upgradePlan = useCallback(async (planId: PlanType, companyId: string) => {
    try {
      setProcessing(true);
      const res = await fetch('/api/stripe/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planId, companyId }) });
      if (!res.ok) { const errorData = await res.json().catch(() => ({})); throw new Error(errorData.error || 'Error al crear sesión de pago'); }
      const data = await res.json();
      const safeUrl = data.success ? getSafeExternalUrl(data.url) : null;
      if (safeUrl) window.location.href = safeUrl;
      else throw new Error('La URL de Stripe recibida no es válida');
    } catch (error: any) {
      console.error('Error upgrading plan:', error);
      toast.error('Error al iniciar proceso de upgrade', { description: error.message || 'Intente de nuevo más tarde' });
      throw error;
    } finally { setProcessing(false); }
  }, []);

  const openPortal = useCallback(async (companyId?: string) => {
    try {
      setProcessing(true);
      const res = await fetch('/api/stripe/portal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ companyId: companyId || undefined }) });
      if (!res.ok) { const errorData = await res.json().catch(() => ({})); throw new Error(errorData.error || 'Error al crear portal'); }
      const data = await res.json();
      const safeUrl = data.success ? getSafeExternalUrl(data.url) : null;
      if (safeUrl) window.location.href = safeUrl;
      else throw new Error('La URL de Stripe recibida no es válida');
    } catch (error: any) {
      console.error('Error opening portal:', error);
      toast.error('Error al abrir portal de gestión', { description: error.message || 'Intente de nuevo más tarde' });
      throw error;
    } finally { setProcessing(false); }
  }, []);

  const verifyUpgrade = useCallback(async (sessionId: string) => {
    try { await fetchSubscriptionStatus(); toast.success('¡Plan actualizado exitosamente!', { description: 'Tu suscripción ha sido activada.' }); return true; }
    catch (error: any) { console.error('Error verifying upgrade:', error); toast.error('Error al verificar upgrade', { description: 'Contacta a soporte para verificar tu suscripción' }); return false; }
  }, [fetchSubscriptionStatus]);

  useEffect(() => { fetchSubscriptionStatus(); }, [fetchSubscriptionStatus]);
  return { subscription, loading, processing, upgradePlan, openPortal, verifyUpgrade, refreshStatus: fetchSubscriptionStatus };
}
