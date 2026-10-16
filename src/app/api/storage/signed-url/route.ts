import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { getSafeStoragePath } from '@/lib/security/safe-storage-path';
import { checkRateLimit, apiLimiter } from '@/lib/rate-limit';
import { internalError } from '@/lib/security/api-error';
import { parseJsonBody } from '@/lib/security/validation';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const requestSchema = z.object({
  fileUrls: z.array(z.string().url().max(4096)).min(1).max(500),
});

const ALLOWED_BUCKETS = new Set([
  'documents',
  'vehicle-images',
  'driver-documents',
  'financial-receipts',
  'general-documents',
  'contract-templates',
  'company-logos',
  'inspection-images',
  'seguimientos',
  'client-documents',
  'clients',
]);

function getSupabaseAdmin() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase admin configuration is missing.');
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const limited = await checkRateLimit(request, apiLimiter);
    if (limited) return limited;

    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const { data: auth, error: authError } = await supabaseAdmin.auth.getUser(authorization.slice(7));
    if (authError || !auth.user) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const parsed = await parseJsonBody(request, requestSchema);
    if (!parsed.ok) return parsed.response;

    if (!supabaseUrl) {
      return NextResponse.json({ error: 'Almacenamiento no configurado.' }, { status: 503 });
    }

    const signedUrls: Record<string, string> = {};
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('company_id, role')
      .eq('id', auth.user.id)
      .single();
    if (profileError || !profile) {
      return NextResponse.json({ error: 'Perfil no encontrado.' }, { status: 403 });
    }

    const isSuperAdmin = profile.role === 'super_admin' || profile.role === 'superAdmin';
    for (const fileUrl of parsed.data.fileUrls) {
      const url = new URL(fileUrl);
      if (url.protocol !== 'https:' || url.hostname !== new URL(supabaseUrl).hostname) {
        return NextResponse.json({ error: 'Archivo no válido.' }, { status: 400 });
      }

      const match = url.pathname.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)/);
      if (!match) return NextResponse.json({ error: 'Referencia de archivo no válida.' }, { status: 400 });

      const bucket = match[1];
      const path = getSafeStoragePath(match[2]);
      if (!ALLOWED_BUCKETS.has(bucket) || !path) {
        return NextResponse.json({ error: 'Referencia de archivo no válida.' }, { status: 400 });
      }

      const segments = path.split('/');
      if (segments.length < 3 || segments[0] !== 'companies' || !segments[1]) {
        return NextResponse.json({ error: 'Referencia de archivo no válida.' }, { status: 400 });
      }
      const fileCompanyId = segments[1];
      if (!isSuperAdmin && profile.company_id !== fileCompanyId) {
        return NextResponse.json({ error: 'No tienes acceso a uno de estos archivos.' }, { status: 403 });
      }

      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .createSignedUrl(path, 60 * 60);
      if (error || !data?.signedUrl) {
        return internalError('API private storage signed URL', error || new Error('Signed URL missing'), {
          bucket,
        });
      }
      signedUrls[fileUrl] = data.signedUrl;
    }

    return NextResponse.json(
      { signedUrls, expiresIn: 3600 },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return internalError('API private storage signed URL', error);
  }
}
