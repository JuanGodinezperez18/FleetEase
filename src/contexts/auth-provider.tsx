"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  User as FirebaseUser,
} from "firebase/auth";
import { auth } from '@/lib/firebase';
import { GlobalLoader } from '@/components/common/GlobalLoader';
import type { UserProfile } from '@/types';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { FCMService } from '@/lib/fcm-service';
import { useUserProfile, useInvalidateUserProfile } from '@/hooks/use-user-profile';
import { logger } from '@/lib/logger';

async function createServerSession(user: FirebaseUser) {
  // 🚧 MODO DESARROLLO: Bypass temporal de session cookie para preview de Firebase
  // Para activar este modo, establece NEXT_PUBLIC_BYPASS_SESSION_COOKIE=true en .env.local
  const bypassSessionCookie = process.env.NEXT_PUBLIC_BYPASS_SESSION_COOKIE === 'true';

  if (bypassSessionCookie) {
    logger.warn('[Auth] MODO DESARROLLO: Bypass de session cookie activado');
    logger.warn('[Auth] La aplicación funcionará sin session cookie del servidor');
    return;
  }

  try {
    logger.info('[Auth] Creando session cookie...');
    const idToken = await user.getIdToken(true);

    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error creando sesión');
    }

    const data = await response.json();
    logger.info('[Auth] Session cookie creada', data);
  } catch (error) {
    logger.error('[Auth] Error creando session cookie', error as Error);
    throw error;
  }
}

interface AuthContextType {
  currentUser: UserProfile | null;
  login: (email: string, pass: string, rememberMe: boolean) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * ✅ OPTIMIZACIÓN: AuthProvider sin onSnapshot
 *
 * Cambios principales:
 * - ❌ Eliminado onSnapshot (lecturas continuas)
 * - ✅ Usa React Query con getDoc (caché de 10 minutos)
 * - ✅ Invalidación manual solo cuando se actualiza el perfil
 *
 * Ahorro: ~50-200 lecturas/día por usuario
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [sessionCreated, setSessionCreated] = useState(false);

  // ✅ Hook optimizado para cargar perfil con React Query
  const {
    data: currentUser,
    isLoading: profileLoading,
    error: profileError
  } = useUserProfile(firebaseUser, { enabled: !!firebaseUser });

  const invalidateUserProfile = useInvalidateUserProfile();

  // Loading combinado: auth + perfil
  const loading = authLoading || (!!firebaseUser && profileLoading);

  useEffect(() => {
    logger.info('[Auth] Iniciando listener de autenticación...');

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      logger.debug('[Auth] Estado cambió', { uid: user ? user.uid : 'Sin usuario' });

      if (user) {
        try {
          // ⚡ OPTIMIZACIÓN: Solo crear session cookie una vez por sesión
          if (!sessionCreated) {
            await createServerSession(user);
            setSessionCreated(true);
          }

          setFirebaseUser(user);
          setAuthLoading(false);

          // Registrar token FCM automáticamente
          if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'granted') {
              FCMService.getToken(user.uid).catch(err => {
                logger.warn('No se pudo registrar token FCM', { error: String(err) });
              });
            } else if (Notification.permission === 'default') {
              logger.info('📱 Notificaciones no habilitadas. El usuario puede habilitarlas desde configuración.');
            }
          }
        } catch (err) {
          logger.error('[Auth] Error', err as Error);
          setFirebaseUser(null);
          setAuthLoading(false);
        }
      } else {
        setFirebaseUser(null);
        setAuthLoading(false);
        setSessionCreated(false);
      }
    });

    return () => {
      unsubAuth();
    };
  }, [sessionCreated]);

  // Log cuando el perfil se carga/actualiza
  useEffect(() => {
    if (currentUser) {
      logger.info('[Auth] Perfil de usuario actualizado', {
        uid: currentUser.uid,
        role: currentUser.role,
        companyId: currentUser.companyId
      });
    }
  }, [currentUser]);

  // Manejar errores de carga de perfil
  useEffect(() => {
    if (profileError) {
      logger.error('[Auth] Error cargando perfil', profileError as Error);
    }
  }, [profileError]);

  const login = async (email: string, pass: string, rememberMe: boolean) => {
    logger.info('[Auth] Iniciando login...');

    try {
      const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistence);

      const { user } = await signInWithEmailAndPassword(auth, email, pass);
      logger.info('[Auth] Usuario autenticado', { uid: user.uid });

      // ✅ Session cookie se crea automáticamente en onAuthStateChanged
      // ✅ El perfil se carga automáticamente con React Query
    } catch (error) {
      logger.error('[Auth] Error en login', error as Error);
      throw error;
    }
  };

  const logout = async () => {
    logger.info('[Auth] Cerrando sesión...');

    try {
      await fetch("/api/logout", { method: "POST" });
      await signOut(auth);
      logger.info('[Auth] Sesión cerrada');
    } catch (error) {
      logger.error('[Auth] Error en logout', error as Error);
      throw error;
    }
  };

  const sendPasswordResetEmail = async (email: string) => {
    await firebaseSendPasswordResetEmail(auth, email);
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!currentUser) throw new Error("No hay usuario autenticado");

    logger.info('[Auth] Actualizando perfil de usuario...');

    try {
      const fn = httpsCallable(getFunctions(auth.app, "us-central1"), "updateUser");
      await fn({ uid: currentUser.uid, ...data });

      // ✅ OPTIMIZACIÓN: Invalidar caché para refrescar datos
      invalidateUserProfile(currentUser.uid);

      logger.info('[Auth] Perfil actualizado e invalidado en caché');
    } catch (error) {
      logger.error('[Auth] Error actualizando perfil', error as Error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser: currentUser ?? null, login, logout, loading, sendPasswordResetEmail, updateUserProfile }}>
      {loading ? <GlobalLoader /> : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
};
