import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { hardenAuthCookieOptions } from '@/lib/security/cookies';
import { NextResponse } from 'next/server';

/**
 * API Logout para Supabase Auth
 *
 * Cierra la sesión del usuario en Supabase y limpia las cookies.
 *
 * @endpoint POST /api/logout
 * @returns {Object} Resultado del logout
 */
export async function POST() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...hardenAuthCookieOptions(options) });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...hardenAuthCookieOptions(options) });
          },
        },
      }
    );

    // Cerrar sesión en Supabase
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Error en logout:', error);
      return NextResponse.json(
        { error: 'Error al cerrar sesión' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 'success',
      message: 'Sesión cerrada exitosamente',
    });
  } catch (err: any) {
    console.error('Error en logout:', err);
    return NextResponse.json(
      { error: err.message || 'Error desconocido' },
      { status: 500 }
    );
  }
}
