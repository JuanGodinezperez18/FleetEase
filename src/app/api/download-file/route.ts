import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { getSafeStoragePath } from '@/lib/security/safe-storage-path';
import { checkRateLimit, apiLimiter } from '@/lib/rate-limit';
import { internalError } from '@/lib/security/api-error';
import { parseJsonBody, urlSchema } from '@/lib/security/validation';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase admin configuration is missing.');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const downloadFileSchema = z.object({
  fileUrl: urlSchema,
});

async function verifyFileOwnership(filePath: string, userId: string): Promise<boolean> {
  const supabaseAdmin = getSupabaseAdmin();
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
      profile.company_id && segments[0] === 'companies' && segments[1] === profile.company_id,
    );
  } catch (error) {
    console.error('[API Download] Error verificando propiedad:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autenticado. Token faltante.' }, { status: 401 });
    }
    const rateLimitResponse = await checkRateLimit(request, apiLimiter);
    if (rateLimitResponse) return rateLimitResponse;
    const token = authHeader.substring(7);
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado. Token inválido.' }, { status: 401 });
    }

    const parsed = await parseJsonBody(request, downloadFileSchema);
    if (!parsed.ok) return parsed.response;

    const fileUrl = parsed.data.fileUrl;
    const parsedUrl = new URL(fileUrl);
    const configuredSupabaseHost = new URL(supabaseUrl!).hostname;

    if (parsedUrl.protocol !== 'https:' || parsedUrl.hostname !== configuredSupabaseHost) {
      return NextResponse.json(
        { error: 'URL de Supabase Storage no válida o no reconocida.' },
        { status: 400 },
      );
    }

    const match = parsedUrl.pathname.match(/\/storage\/v1\/object\/public\/([^\/]+)\/(.+)/);
    if (!match || match[1] !== 'documents') {
      return NextResponse.json(
        { error: 'URL de Supabase Storage no válida o no reconocida.' },
        { status: 400 },
      );
    }

    const filePath = getSafeStoragePath(match[2]);
    if (!filePath || filePath.includes('../') || filePath.includes('..\\')) {
      return NextResponse.json({ error: 'Ruta de archivo no válida.' }, { status: 400 });
    }

    if (!(await verifyFileOwnership(filePath, user.id))) {
      return NextResponse.json(
        { error: 'No tienes permisos para acceder a este archivo.' },
        { status: 403 },
      );
    }

    const { data, error } = await supabaseAdmin.storage
      .from('documents')
      .createSignedUrl(filePath, 15 * 60);

    if (error) {
      return internalError('API Download signedUrl', error);
    }

    return NextResponse.json({ success: true, signedUrl: data.signedUrl });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error.message.includes('token') || error.message.includes('expired'))
    ) {
      return NextResponse.json(
        { error: 'No autenticado. Token inválido o faltante.' },
        { status: 401 },
      );
    }
    return internalError('API Download', error);
  }
}
