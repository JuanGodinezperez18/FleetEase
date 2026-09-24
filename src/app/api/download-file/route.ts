import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { getSafeStoragePath } from '@/lib/security/safe-storage-path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DownloadFileSchema = z.object({
  fileUrl: z.string().url('URL de archivo inválida'),
});

async function verifyFileOwnership(filePath: string, userId: string): Promise<boolean> {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('users')
      .select('company_id, role')
      .eq('id', userId)
      .single();

    if (error || !profile) return false;
    if (profile.role === 'super_admin') return true;

    const segments = filePath.split('/');
    if (segments.includes(userId)) return true;

    return Boolean(
      profile.company_id &&
      segments[0] === 'companies' &&
      segments[1] === profile.company_id
    );
  } catch (error) {
    console.error('⚠️ [API Download] Error verificando propiedad:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  const isDev = process.env.NODE_ENV === 'development';
  
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autenticado. Token faltante.' }, { status: 401 });
    }
    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado. Token inválido.' }, { status: 401 });
    }
    
    const parsed = DownloadFileSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.errors.map(e => e.message).join(', ') },
        { status: 400 }
      );
    }

    const fileUrl = parsed.data.fileUrl;
    const parsedUrl = new URL(fileUrl);
    const configuredSupabaseHost = new URL(supabaseUrl).hostname;

    if (
      parsedUrl.protocol !== 'https:' ||
      parsedUrl.hostname !== configuredSupabaseHost
    ) {
      return NextResponse.json({ error: 'URL de Supabase Storage no válida o no reconocida.' }, { status: 400 });
    }

    const match = parsedUrl.pathname.match(/\/storage\/v1\/object\/public\/([^\/]+)\/(.+)/);
    if (!match || match[1] !== 'documents') {
      return NextResponse.json({ error: 'URL de Supabase Storage no válida o no reconocida.' }, { status: 400 });
    }

    const filePath = getSafeStoragePath(match[2]);
    if (!filePath || filePath.includes('../') || filePath.includes('..\\')) {
      return NextResponse.json({ error: 'Ruta de archivo no válida.' }, { status: 400 });
    }
    
    const isOwner = await verifyFileOwnership(filePath, user.id);
    if (!isOwner) {
      return NextResponse.json({ error: 'No tienes permisos para acceder a este archivo.' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin.storage
      .from('documents')
      .createSignedUrl(filePath, 15 * 60);
    
    if (error) {
      console.error('❌ [API Download] Error generando URL firmada:', error);
      throw error;
    }

    return NextResponse.json({ success: true, signedUrl: data.signedUrl });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message.includes('token') || error.message.includes('expired'))) {
      return NextResponse.json({ error: 'No autenticado. Token inválido o faltante.' }, { status: 401 });
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('❌ [API Download] Error:', error);
    
    if (errorMessage.includes('No tienes permisos')) return NextResponse.json({ error: errorMessage }, { status: 403 });
    if (errorMessage.includes('URL de Supabase Storage no válida')) return NextResponse.json({ error: errorMessage }, { status: 400 });
    
    return NextResponse.json({ error: 'Error al procesar la solicitud.', details: isDev ? errorMessage : undefined }, { status: 500 });
  }
}