"use client";

/**
 * Cliente de Supabase para el navegador compatible con @supabase/ssr.
 *
 * La aplicación usa middleware SSR para proteger /dashboard. Por eso la
 * sesión del navegador debe persistirse en cookies que el middleware pueda
 * leer, no únicamente en localStorage del cliente clásico de supabase-js.
 *
 * Se conserva persistSession=true para mantener el comportamiento de
 * "recordar sesión".
 */
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY no están configuradas.'
  );
}

export const supabase: SupabaseClient<Database> = createBrowserClient<Database>(
  supabaseUrl!,
  supabaseAnonKey!,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    db: { schema: 'public' },
    global: {
      headers: { 'Content-Type': 'application/json' },
    },
  }
);
