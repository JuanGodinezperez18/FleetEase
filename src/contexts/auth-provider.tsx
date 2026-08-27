"use client";

// Alias del Auth Provider de Supabase (para compatibilidad con imports existentes)
export { SupabaseAuthProvider as AuthProvider, useAuth } from './auth-provider-supabase';
export type { AuthContextType } from './auth-provider-supabase';
