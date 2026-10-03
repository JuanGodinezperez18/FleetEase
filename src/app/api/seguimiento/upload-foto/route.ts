import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSafeStorageSegment } from '@/lib/security/safe-storage-path';
import { checkRateLimit, uploadLimiter } from '@/lib/rate-limit';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase admin configuration is missing.');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/jpg'];
const BUCKET_NAME = 'seguimientos';

/** Crea el bucket si no existe (público: la app usa getPublicUrl). */
async function ensureBucket(): Promise<void> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  if (buckets?.some(b => b.name === BUCKET_NAME)) return;

  const { error } = await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
    public: true,
    fileSizeLimit: MAX_SIZE_BYTES,
    allowedMimeTypes: ALLOWED_MIME_TYPES,
  });

  if (error && !/already exists|duplicate/i.test(error.message)) {
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();
  const isDev = process.env.NODE_ENV === 'development';
  try {
    const rateLimitResponse = await checkRateLimit(request, uploadLimiter);
    if (rateLimitResponse) return rateLimitResponse;
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'No autenticado. Token faltante.' }, { status: 401 });
    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'No autenticado. Token inválido.' }, { status: 401 });

    const { data: userProfile, error: profileError } = await supabaseAdmin.from('users').select('company_id, role').eq('id', user.id).single();
    if (profileError || !userProfile) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const rawVehicleId = formData.get('vehicleId') as string;
    const clientId = formData.get('clientId') as string | null;
    const latitude = formData.get('latitude') as string | null;
    const longitude = formData.get('longitude') as string | null;
    const speed = formData.get('speed') as string | null;
    const heading = formData.get('heading') as string | null;
    const notes = formData.get('notes') as string | null;

    if (!file) return NextResponse.json({ error: 'No se encontró archivo en la solicitud.' }, { status: 400 });
    if (!rawVehicleId) return NextResponse.json({ error: 'Falta vehicleId' }, { status: 400 });
    const vehicleId = getSafeStorageSegment(rawVehicleId);
    if (!vehicleId) return NextResponse.json({ error: 'Ruta de almacenamiento no válida.' }, { status: 400 });

    const effectiveType =
      file.type ||
      (file.name.match(/\.jpe?g$/i) ? 'image/jpeg' :
        file.name.match(/\.png$/i) ? 'image/png' :
          file.name.match(/\.webp$/i) ? 'image/webp' :
            file.name.match(/\.heic$/i) ? 'image/heic' : file.type);

    if (!ALLOWED_MIME_TYPES.includes(effectiveType) && !ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `Tipo de archivo no permitido. Permitidos: ${ALLOWED_MIME_TYPES.join(', ')}` }, { status: 415 });
    }
    if (file.size > MAX_SIZE_BYTES) return NextResponse.json({ error: 'Archivo demasiado grande. Límite: 10MB' }, { status: 413 });

    const { data: vehicle, error: vehicleError } = await supabaseAdmin.from('vehicles').select('id, company_id').eq('id', vehicleId).single();
    if (vehicleError || !vehicle) return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 });
    if (vehicle.company_id !== userProfile.company_id && userProfile.role !== 'super_admin' && userProfile.role !== 'superAdmin') {
      return NextResponse.json({ error: 'No tienes permisos para este vehículo' }, { status: 403 });
    }

    try {
      await ensureBucket();
    } catch (bucketErr) {
      if (isDev) console.error('[seguimiento/upload-foto] ensureBucket:', bucketErr);
      return NextResponse.json({
        error: `No se pudo preparar el bucket "${BUCKET_NAME}". Créalo en Supabase Storage (público) o revisa permisos del service role.`,
      }, { status: 500 });
    }

    const fileExtension = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'jpg';
    const uniqueFileName = `${user.id}-${Date.now()}.${fileExtension}`;
    const fullPath = `vehicles/${vehicleId}/${uniqueFileName}`;
    if (fullPath.includes('../') || fullPath.includes('..\\')) return NextResponse.json({ error: 'Ruta de almacenamiento no válida.' }, { status: 400 });

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const contentType = effectiveType || file.type || 'image/jpeg';
    let uploadError = (await supabaseAdmin.storage.from(BUCKET_NAME).upload(fullPath, fileBuffer, { contentType, upsert: false })).error;

    if (uploadError && /bucket not found/i.test(uploadError.message)) {
      try {
        await ensureBucket();
        uploadError = (await supabaseAdmin.storage.from(BUCKET_NAME).upload(fullPath, fileBuffer, { contentType, upsert: false })).error;
      } catch (retryErr) {
        if (isDev) console.error('[seguimiento/upload-foto] retry after create bucket:', retryErr);
      }
    }

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(fullPath);
    const { data: seguimiento, error: seguimientoError } = await supabaseAdmin.from('seguimientos').insert({
      vehicle_id: vehicleId,
      client_id: clientId,
      company_id: vehicle.company_id,
      photo_url: publicUrl,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      speed: speed ? parseFloat(speed) : null,
      heading: heading ? parseFloat(heading) : null,
      notes,
      created_by: user.id,
    }).select().single();
    if (seguimientoError) throw seguimientoError;

    return NextResponse.json({ success: true, url: publicUrl, seguimiento });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message.includes('token') || error.message.includes('expired'))) return NextResponse.json({ error: 'No autenticado. Token inválido o faltante.' }, { status: 401 });
    if (isDev) console.error('[seguimiento/upload-foto] Error:', error);
    return NextResponse.json({ error: 'Error al procesar la subida' }, { status: 500 });
  }
}
