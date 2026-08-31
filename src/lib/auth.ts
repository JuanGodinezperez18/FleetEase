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

export interface SignUpParams { email: string; password: string; name: string; phone?: string; role?: UserRole; company_id?: string; }
export interface SignInParams { email: string; password: string; }
export interface PasswordResetParams { email: string; }
export interface UpdatePasswordParams { newPassword: string; }
export interface AuthResponse { user: User | null; error: Error | null; }

export async function signUp(params: SignUpParams): Promise<AuthResponse> {
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({ email: params.email, password: params.password, options: { data: { name: params.name, phone: params.phone } } });
    if (authError) return { user: null, error: authError };
    if (!authData.user) return { user: null, error: new Error('No se pudo crear el usuario') };
    const userProfile = await userService.add({ id: authData.user.id, email: params.email, name: params.name, phone: params.phone, role: params.role || 'viewer', company_id: params.company_id, is_deleted: false });
    return { user: userProfile, error: null };
  } catch (error) { return { user: null, error: error instanceof Error ? error : new Error('Error desconocido') }; }
}

export async function signIn(params: SignInParams): Promise<AuthResponse> {
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email: params.email, password: params.password });
    if (authError) return { user: null, error: authError };
    if (!authData.user) return { user: null, error: new Error('Credenciales inválidas') };
    const userProfile = await userService.get(authData.user.id);
    if (!userProfile) return { user: null, error: new Error('Perfil de usuario no encontrado') };
    if (userProfile.is_deleted) return { user: null, error: new Error('Usuario eliminado') };
    return { user: userProfile, error: null };
  } catch (error) { return { user: null, error: error instanceof Error ? error : new Error('Error desconocido') }; }
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) return null;
    const userProfile = await userService.get(authUser.id);
    if (!userProfile || userProfile.is_deleted) return null;
    return userProfile;
  } catch { return null; }
}

export function onAuthStateChange(callback: (user: User | null) => void): { subscription: { unsubscribe: () => void } } {
  getCurrentUser().then(callback);
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user) {
      const userProfile = await userService.get(session.user.id);
      callback(userProfile || null);
    } else callback(null);
  });
  return { subscription };
}

export async function resetPassword(params: PasswordResetParams): Promise<Error | null> {
  try {
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://fleetease.com.mx')).replace(/\/$/, '');
    const { error } = await supabase.auth.resetPasswordForEmail(params.email, { redirectTo: `${siteUrl}/reset-password` });
    if (error) return error;
    return null;
  } catch (error) { return error instanceof Error ? error : new Error('Error desconocido'); }
}

export async function updatePassword(params: UpdatePasswordParams): Promise<Error | null> {
  try {
    const { error } = await supabase.auth.updateUser({ password: params.newPassword });
    if (error) return error;
    return null;
  } catch (error) { return error instanceof Error ? error : new Error('Error desconocido'); }
}

export async function updateUserProfile(userId: string, updates: Partial<User>): Promise<Error | null> {
  try { await userService.update(userId, updates); return null; }
  catch (error) { return error instanceof Error ? error : new Error('Error desconocido'); }
}

export async function signInWithOAuth(provider: 'google' | 'facebook' | 'github') {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://fleetease.com.mx')).replace(/\/$/, '');
  return supabase.auth.signInWithOAuth({ provider, options: { redirectTo: `${siteUrl}/auth/callback` } });
}

export function formatAuthError(error: any): string {
  if (!error) return 'Error desconocido';
  const message = error.message || String(error);
  if (message.toLowerCase().includes('invalid login credentials')) return 'Correo o contraseña incorrectos';
  if (message.toLowerCase().includes('email not confirmed')) return 'Debes confirmar tu correo electrónico antes de iniciar sesión';
  if (message.toLowerCase().includes('too many requests')) return 'Demasiados intentos. Intenta nuevamente más tarde';
  return message;
}
