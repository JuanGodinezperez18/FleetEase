"use client";

/**
 * Auth Provider con Supabase.
 * Mantiene una única fuente de verdad para la sesión de Supabase Auth.
 */
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { GlobalLoader } from '@/components/common/GlobalLoader';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseProfile } from '@/types/supabase';
import type { UserProfile } from '@/types';
import { signIn, signOut, resetPassword, formatAuthError } from '@/lib/auth';
import { userService } from '@/lib/supabase-services';
import { logger } from '@/lib/logger';

function adaptUserToProfile(user: SupabaseProfile): UserProfile {
  return {
    uid: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone ?? undefined,
    street: user.street ?? undefined,
    city: user.city ?? undefined,
    state: user.state ?? undefined,
    zipCode: user.zip_code ?? undefined,
    country: user.country ?? undefined,
    role: user.role === 'super_admin' ? 'superAdmin' : user.role,
    companyId: user.company_id ?? undefined,
    partnerAccess: user.partner_access ?? undefined,
    notificationSettings: user.notification_settings ?? undefined,
    isDeleted: user.is_deleted,
    createdAt: user.created_at,
    updatedAt: user.updated_at ?? undefined,
    pushSubscriptions: (user.push_subscriptions as any[] | undefined) ?? undefined,
  };
}

export interface AuthContextType {
  currentUser: UserProfile | null;
  login: (email: string, pass: string, rememberMe: boolean) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const SupabaseAuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let initialSessionResolved = false;

    const loadProfile = async (authUserId: string, preserveCurrentUser = false) => {
      try {
        const profile = await userService.get(authUserId);
        if (!mounted) return;

        if (profile && !profile.is_deleted) {
          setCurrentUser(adaptUserToProfile(profile));
        } else if (!preserveCurrentUser) {
          setCurrentUser(null);
        }
      } catch (error) {
        logger.error('[Supabase Auth] Error cargando perfil', error as Error);
        // A valid Auth session should not be replaced by null because the
        // profile request failed transiently. Keep any existing user intact.
        if (!preserveCurrentUser && mounted) setCurrentUser(null);
      }
    };

    const initializeSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (data.session?.user) {
          await loadProfile(data.session.user.id, false);
        } else if (mounted) {
          setCurrentUser(null);
        }
      } catch (error) {
        logger.error('[Supabase Auth] Error obteniendo sesión inicial', error as Error);
        if (mounted) setCurrentUser(null);
      } finally {
        if (mounted) {
          initialSessionResolved = true;
          setLoading(false);
        }
      }
    };

    initializeSession();

    // One and only one auth listener. It never performs the initial session
    // read and therefore cannot race with initializeSession().
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted || !initialSessionResolved) return;

      logger.debug('[Supabase Auth] Estado cambió', {
        event,
        uid: session?.user?.id ?? 'Sin usuario',
      });

      if (event === 'SIGNED_OUT' || !session?.user) {
        setCurrentUser(null);
        setLoading(false);
        return;
      }

      // Refresh the profile in the background without blanking a valid user.
      void loadProfile(session.user.id, true);
    });

    const safetyTimer = window.setTimeout(() => {
      if (mounted) {
        logger.warn('[Supabase Auth] Timeout de inicialización; liberando loader');
        setLoading(false);
      }
    }, 8000);

    return () => {
      mounted = false;
      window.clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, pass: string, _rememberMe: boolean) => {
    logger.info('[Supabase Auth] Iniciando login...');
    setLoading(true);
    try {
      const { user, error } = await signIn({ email, password: pass });
      if (error) {
        const formattedError = formatAuthError(error);
        logger.error('[Supabase Auth] Error en login', formattedError);
        throw new Error(formattedError);
      }
      if (!user) throw new Error('Usuario no encontrado');
      setCurrentUser(adaptUserToProfile(user));
      logger.info('[Supabase Auth] Usuario autenticado', { uid: user.id });
    } catch (error) {
      logger.error('[Supabase Auth] Error en login', error as Error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await signOut();
    setCurrentUser(null);
  };

  const sendPasswordResetEmail = async (email: string) => {
    logger.info('[Supabase Auth] Enviando email de recuperación...');
    const error = await resetPassword({ email });
    if (error) {
      logger.error('[Supabase Auth] Error enviando email de recuperación', error);
      throw error;
    }
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!currentUser) throw new Error('No hay usuario autenticado');
    const supabaseData: Partial<SupabaseProfile> = {
      name: data.name,
      phone: data.phone ?? null,
      street: data.street ?? null,
      city: data.city ?? null,
      state: data.state ?? null,
      zip_code: data.zipCode ?? null,
      country: data.country ?? null,
      role: (data.role === 'superAdmin' ? 'super_admin' : data.role) as SupabaseProfile['role'],
      company_id: data.companyId ?? null,
      partner_access: data.partnerAccess ?? null,
      notification_settings: data.notificationSettings ?? null,
      push_subscriptions: data.pushSubscriptions ?? null,
    };
    await userService.update(currentUser.uid, supabaseData);
    setCurrentUser(prev => prev ? { ...prev, ...data } : null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, loading, sendPasswordResetEmail, updateUserProfile }}>
      {loading ? <GlobalLoader /> : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de SupabaseAuthProvider');
  return ctx;
};
