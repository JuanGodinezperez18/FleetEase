"use client";

/**
 * Auth Provider con Supabase.
 * Mantiene compatibilidad con la API existente de FleetEase.
 */
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { GlobalLoader } from '@/components/common/GlobalLoader';
import type { User as SupabaseUser } from '@/types/supabase';
import type { UserProfile } from '@/types';
import { signIn, signOut, onAuthStateChange, resetPassword, formatAuthError } from '@/lib/auth';
import { userService } from '@/lib/supabase-services';
import { logger } from '@/lib/logger';

function adaptUserToProfile(user: SupabaseUser): UserProfile {
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
    logger.info('[Supabase Auth] Iniciando listener de autenticación...');

    const handleAuthUser = (user: SupabaseUser | null) => {
      // La landing pública NO debe redirigir automáticamente al dashboard.
      // Esto evita el ciclo / -> /dashboard -> /login?callbackUrl=/dashboard
      // cuando el navegador conserva una sesión/cookie de Supabase (por
      // ejemplo después de una recuperación de contraseña).
      const isLanding = typeof window !== 'undefined' && window.location.pathname === '/';

      if (isLanding) {
        setCurrentUser(null);
      } else if (user) {
        setCurrentUser(adaptUserToProfile(user));
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    };

    const { subscription } = onAuthStateChange((user) => {
      logger.debug('[Supabase Auth] Estado cambió', { uid: user?.id ?? 'Sin usuario' });
      handleAuthUser(user);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, pass: string, _rememberMe: boolean) => {
    logger.info('[Supabase Auth] Iniciando login...');
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
    const supabaseData: Partial<SupabaseUser> = {
      name: data.name,
      phone: data.phone ?? null,
      street: data.street ?? null,
      city: data.city ?? null,
      state: data.state ?? null,
      zip_code: data.zipCode ?? null,
      country: data.country ?? null,
      role: (data.role === 'superAdmin' ? 'super_admin' : data.role) as SupabaseUser['role'],
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
