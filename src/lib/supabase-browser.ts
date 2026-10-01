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

export type { Database } from './supabase';
export type { Json } from './supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY no están configuradas.'
  );
}

const browserClient = createBrowserClient<Database>(
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

// @supabase/ssr currently returns SupabaseClient<Database, 'public', Schema>,
// while supabase-js expects SchemaName as its third generic parameter. The
// runtime client still uses the generated public Database schema configured
// above, so normalize that declaration mismatch at this single boundary.
export const supabase = browserClient as unknown as SupabaseClient<Database>;
