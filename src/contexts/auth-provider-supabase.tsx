"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { GlobalLoader } from '@/components/common/GlobalLoader';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseProfile } from '@/types/supabase';
import type { UserProfile } from '@/types';
import { signIn, signOut, resetPassword, formatAuthError } from '@/lib/auth';
import { logger } from '@/lib/logger';

const PROFILE_CACHE_KEY = 'fleetease.auth.profile.v1';

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

function readCachedProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserProfile;
    return parsed?.uid && parsed?.role ? parsed : null;
  } catch { return null; }
}

function cacheProfile(profile: UserProfile) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile)); } catch {}
}

function clearCachedProfile() {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(PROFILE_CACHE_KEY); } catch {}
}

async function fetchProfileThroughApp(authUserId: string): Promise<SupabaseProfile | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token || sessionData.session?.user?.id !== authUserId) return null;

  const response = await fetch('/api/auth/profile', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Profile endpoint ${response.status}`);
  const body = await response.json();
  return body.profile ?? null;
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
        const profile = await fetchProfileThroughApp(authUserId);
        if (!mounted) return;
        if (profile && !profile.is_deleted) {
          const adapted = adaptUserToProfile(profile);
          cacheProfile(adapted);
          setCurrentUser(adapted);
        } else if (!preserveCurrentUser) {
          clearCachedProfile();
          setCurrentUser(null);
        }
      } catch (error) {
        logger.error('[Supabase Auth] Error cargando perfil', error as Error);
        // Never erase a valid session because profile transport failed.
        // The dashboard can continue with a previously cached profile.
      }
    };

    const initializeSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (data.session?.user) {
          const cachedProfile = readCachedProfile();
          if (cachedProfile && cachedProfile.uid === data.session.user.id && !cachedProfile.isDeleted) {
            if (mounted) {
              setCurrentUser(cachedProfile);
              setLoading(false);
              initialSessionResolved = true;
            }
            void loadProfile(data.session.user.id, true);
            return;
          }

          // Resolve auth immediately. Profile is fetched through a same-origin
          // server endpoint so browser TLS problems against *.supabase.co do
          // not freeze the dashboard.
          initialSessionResolved = true;
          if (mounted) setLoading(false);
          void loadProfile(data.session.user.id, false);
        } else if (mounted) {
          clearCachedProfile();
          setCurrentUser(null);
          initialSessionResolved = true;
          setLoading(false);
        }
      } catch (error) {
        logger.error('[Supabase Auth] Error obteniendo sesión inicial', error as Error);
        if (mounted) {
          const cachedProfile = readCachedProfile();
          if (cachedProfile) setCurrentUser(cachedProfile);
          initialSessionResolved = true;
          setLoading(false);
        }
      }
    };

    void initializeSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted || !initialSessionResolved) return;
      logger.debug('[Supabase Auth] Estado cambió', { event, uid: session?.user?.id ?? 'Sin usuario' });
      if (event === 'SIGNED_OUT' || !session?.user) {
        clearCachedProfile();
        setCurrentUser(null);
        setLoading(false);
        return;
      }
      void loadProfile(session.user.id, true);
    });

    return () => {
      mounted = false;
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
      const profile = adaptUserToProfile(user);
      cacheProfile(profile);
      setCurrentUser(profile);
      logger.info('[Supabase Auth] Usuario autenticado', { uid: user.id });
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await signOut();
    clearCachedProfile();
    setCurrentUser(null);
  };

  const sendPasswordResetEmail = async (email: string) => {
    const error = await resetPassword({ email });
    if (error) throw error;
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!currentUser) throw new Error('No hay usuario autenticado');
    const { data: updated, error } = await supabase
      .from('users')
      .update({
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
      })
      .eq('id', currentUser.uid)
      .select('*')
      .single();
    if (error) throw error;
    if (updated) {
      const profile = adaptUserToProfile(updated as SupabaseProfile);
      cacheProfile(profile);
      setCurrentUser(profile);
    }
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
