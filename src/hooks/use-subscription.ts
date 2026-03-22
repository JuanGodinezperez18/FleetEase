import { useState, useCallback, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';
import type { PlanType } from '@/config/plans';

export interface SubscriptionStatus {
  plan: PlanType;
  maxVehicles: number;
  maxUsers: number;
  currentPeriodEnd?: string;
  vehicleCount: number;
  subscription: {
    status: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
}

export function useSubscription() {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);

  const fetchSubscriptionStatus = useCallback(async () => {
    try {
      setLoading(true);
      const functions = getFunctions();
      const getSubscriptionStatus = httpsCallable(functions, 'getSubscriptionStatus');
      
      const result = await getSubscriptionStatus();
      const data = result.data as any;
      
      if (data.success) {
        setSubscription(data);
      }
    } catch (error: any) {
      console.error('Error fetching subscription status:', error);
      // Si no hay suscripción, usar plan starter por defecto
      setSubscription({
        plan: 'starter',
        maxVehicles: 5,
        maxUsers: 1,
        vehicleCount: 0,
        subscription: null,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const upgradePlan = useCallback(async (planId: PlanType, companyId: string) => {
    try {
      setProcessing(true);
      const functions = getFunctions();
      const createCheckoutSession = httpsCallable(functions, 'createCheckoutSession');
      
      const result = await createCheckoutSession({ planId, companyId });
      const data = result.data as any;
      
      if (data.success && data.url) {
        // Redirigir a Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error('Error al crear sesión de pago');
      }
    } catch (error: any) {
      console.error('Error upgrading plan:', error);
      toast.error('Error al iniciar proceso de upgrade', {
        description: error.message || 'Intente de nuevo más tarde',
      });
      throw error;
    } finally {
      setProcessing(false);
    }
  }, []);

  const openPortal = useCallback(async (companyId?: string) => {
    try {
      setProcessing(true);
      const functions = getFunctions();
      const createPortalSession = httpsCallable(functions, 'createPortalSession');
      
      const result = await createPortalSession({ companyId });
      const data = result.data as any;
      
      if (data.success && data.url) {
        // Redirigir al portal de Stripe
        window.location.href = data.url;
      } else {
        throw new Error('Error al crear portal');
      }
    } catch (error: any) {
      console.error('Error opening portal:', error);
      toast.error('Error al abrir portal de gestión', {
        description: error.message || 'Intente de nuevo más tarde',
      });
      throw error;
    } finally {
      setProcessing(false);
    }
  }, []);

  const verifyUpgrade = useCallback(async (sessionId: string) => {
    try {
      const functions = getFunctions();
      const handleStripeWebhook = httpsCallable(functions, 'handleStripeWebhook');
      
      const result = await handleStripeWebhook({ sessionId });
      const data = result.data as any;
      
      if (data.success) {
        toast.success('¡Plan actualizado exitosamente!', {
          description: 'Tu suscripción ha sido activada.',
        });
        await fetchSubscriptionStatus();
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Error verifying upgrade:', error);
      toast.error('Error al verificar upgrade', {
        description: 'Contacta a soporte para verificar tu suscripción',
      });
      return false;
    }
  }, [fetchSubscriptionStatus]);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, [fetchSubscriptionStatus]);

  return {
    subscription,
    loading,
    processing,
    upgradePlan,
    openPortal,
    verifyUpgrade,
    refreshStatus: fetchSubscriptionStatus,
  };
}
