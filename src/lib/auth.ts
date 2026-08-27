/**
 * @fileoverview Servicio de autenticación con Supabase Auth
 * 
 * Reemplaza a Firebase Auth proporcionando:
 * - Registro de usuarios
 * - Login/Logout
 * - Recuperación de contraseña
 * - Gestión de sesión
 * - OAuth (Google, Facebook, etc.)
 */

import { supabase, type User } from '@/lib/supabase';
import type { UserRole } from '@/types/supabase';
import { userService } from '@/lib/supabase-services';

// =====================================================
// TIPOS
// =====================================================

export interface SignUpParams {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role?: UserRole;
  company_id?: string;
}

export interface SignInParams {
  email: string;
  password: string;
}

export interface PasswordResetParams {
  email: string;
}

export interface UpdatePasswordParams {
  newPassword: string;
}

export interface AuthResponse {
  user: User | null;
  error: Error | null;
}

// =====================================================
// FUNCIONES DE AUTENTICACIÓN
// =====================================================

/**
 * Registrar un nuevo usuario
 */
export async function signUp(params: SignUpParams): Promise<AuthResponse> {
  try {
    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: {
          name: params.name,
          phone: params.phone,
        },
      },
    });

    if (authError) {
      console.error('[Supabase Auth] Sign up error:', authError);
      return { user: null, error: authError };
    }

    if (!authData.user) {
      return { 
        user: null, 
        error: new Error('No se pudo crear el usuario') 
      };
    }

    // 2. Crear perfil en la tabla users
    const userProfile = await userService.add({
      id: authData.user.id,
      email: params.email,
      name: params.name,
      phone: params.phone,
      role: params.role || 'viewer',
      company_id: params.company_id,
      is_deleted: false,
    });

    return { user: userProfile, error: null };
  } catch (error) {
    console.error('[Supabase Auth] Sign up error:', error);
    return { 
      user: null, 
      error: error instanceof Error ? error : new Error('Error desconocido') 
    };
  }
}

/**
 * Iniciar sesión con email y contraseña
 */
export async function signIn(params: SignInParams): Promise<AuthResponse> {
  try {
    // 1. Autenticar con Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: params.email,
      password: params.password,
    });

    if (authError) {
      console.error('[Supabase Auth] Sign in error:', authError);
      return { user: null, error: authError };
    }

    if (!authData.user) {
      return { 
        user: null, 
        error: new Error('Credenciales inválidas') 
      };
    }

    // 2. Obtener perfil del usuario
    const userProfile = await userService.get(authData.user.id);

    if (!userProfile) {
      console.error('[Supabase Auth] User profile not found:', authData.user.id);
      return { 
        user: null, 
        error: new Error('Perfil de usuario no encontrado') 
      };
    }

    if (userProfile.is_deleted) {
      return { 
        user: null, 
        error: new Error('Usuario eliminado') 
      };
    }

    return { user: userProfile, error: null };
  } catch (error) {
    console.error('[Supabase Auth] Sign in error:', error);
    return { 
      user: null, 
      error: error instanceof Error ? error : new Error('Error desconocido') 
    };
  }
}

/**
 * Cerrar sesión
 */
export async function signOut(): Promise<void> {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('[Supabase Auth] Sign out error:', error);
      throw error;
    }
  } catch (error) {
    console.error('[Supabase Auth] Sign out error:', error);
    throw error;
  }
}

/**
 * Obtener usuario actual
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    // 1. Obtener usuario de Auth
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return null;
    }

    // 2. Obtener perfil de la base de datos
    const userProfile = await userService.get(authUser.id);

    if (!userProfile || userProfile.is_deleted) {
      return null;
    }

    return userProfile;
  } catch (error) {
    console.error('[Supabase Auth] Get current user error:', error);
    return null;
  }
}

/**
 * Escuchar cambios de autenticación
 */
export function onAuthStateChange(
  callback: (user: User | null) => void
): { subscription: { unsubscribe: () => void } } {
  // 1. Obtener usuario inicial
  getCurrentUser().then(callback);

  // 2. Suscribirse a cambios
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('[Supabase Auth] Auth state changed:', event);
    
    if (session?.user) {
      const userProfile = await userService.get(session.user.id);
      callback(userProfile || null);
    } else {
      callback(null);
    }
  });

  return { subscription };
}

/**
 * Enviar email de recuperación de contraseña
 */
export async function resetPassword(params: PasswordResetParams): Promise<Error | null> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(params.email, {
      redirectTo: `${window.location.origin}/dashboard/reset-password`,
    });

    if (error) {
      console.error('[Supabase Auth] Password reset error:', error);
      return error;
    }

    return null;
  } catch (error) {
    console.error('[Supabase Auth] Password reset error:', error);
    return error instanceof Error ? error : new Error('Error desconocido');
  }
}

/**
 * Actualizar contraseña
 */
export async function updatePassword(params: UpdatePasswordParams): Promise<Error | null> {
  try {
    const { error } = await supabase.auth.updateUser({
      password: params.newPassword,
    });

    if (error) {
      console.error('[Supabase Auth] Update password error:', error);
      return error;
    }

    return null;
  } catch (error) {
    console.error('[Supabase Auth] Update password error:', error);
    return error instanceof Error ? error : new Error('Error desconocido');
  }
}

/**
 * Actualizar perfil de usuario
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<User>
): Promise<Error | null> {
  try {
    await userService.update(userId, updates);
    return null;
  } catch (error) {
    console.error('[Supabase Auth] Update user profile error:', error);
    return error instanceof Error ? error : new Error('Error desconocido');
  }
}

/**
 * Login con OAuth (Google, Facebook, etc.)
 */
export async function signInWithOAuth(
  provider: 'google' | 'facebook' | 'github' | 'discord',
  redirectTo?: string
): Promise<{ url?: string; error: Error | null }> {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectTo || `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      console.error('[Supabase Auth] OAuth sign in error:', error);
      return { url: undefined, error };
    }

    return { url: data.url, error: null };
  } catch (error) {
    console.error('[Supabase Auth] OAuth sign in error:', error);
    return { 
      url: undefined, 
      error: error instanceof Error ? error : new Error('Error desconocido') 
    };
  }
}

/**
 * Verificar si el usuario está autenticado
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

/**
 * Obtener token de sesión
 */
export async function getSessionToken(): Promise<string | null> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      return null;
    }

    return session.access_token;
  } catch (error) {
    console.error('[Supabase Auth] Get session token error:', error);
    return null;
  }
}

/**
 * Refresh token
 */
export async function refreshSession(): Promise<Error | null> {
  try {
    const { error } = await supabase.auth.refreshSession();

    if (error) {
      console.error('[Supabase Auth] Refresh session error:', error);
      return error;
    }

    return null;
  } catch (error) {
    console.error('[Supabase Auth] Refresh session error:', error);
    return error instanceof Error ? error : new Error('Error desconocido');
  }
}

// =====================================================
// HELPERS ADICIONALES
// =====================================================

/**
 * Formatear error de autenticación para mostrar al usuario
 */
export function formatAuthError(error: Error): string {
  const message = error.message;

  // Errores comunes de Supabase
  if (message.includes('Invalid login credentials')) {
    return 'Email o contraseña inválidos';
  }
  if (message.includes('User already registered')) {
    return 'Este email ya está registrado';
  }
  if (message.includes('Weak password')) {
    return 'La contraseña es muy débil. Debe tener al menos 6 caracteres';
  }
  if (message.includes('Email not confirmed')) {
    return 'Por favor verifica tu email antes de iniciar sesión';
  }
  if (message.includes('Provider not found')) {
    return 'Proveedor de autenticación no encontrado';
  }

  return message;
}

/**
 * Validar contraseña
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 6) {
    return { valid: false, error: 'La contraseña debe tener al menos 6 caracteres' };
  }

  return { valid: true };
}

/**
 * Validar email
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Email inválido' };
  }

  return { valid: true };
}
