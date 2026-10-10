import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { getSafeStorageSegment } from '@/lib/security/safe-storage-path';
import { checkRateLimit, uploadLimiter } from '@/lib/rate-limit';
import { internalError } from '@/lib/security/api-error';
import {
  idSchema,
  parseFormFields,
  validateUploadFile,
} from '@/lib/security/validation';

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

const seguimientoFieldsSchema = z.object({
  vehicleId: idSchema,
  clientId: idSchema.optional(),
  latitude: z.string().trim().max(32).optional(),
  longitude: z.string().trim().max(32).optional(),
  speed: z.string().trim().max(32).optional(),
  heading: z.string().trim().max(32).optional(),
  notes: z.string().trim().max(2000).refine(value => !/[<>]/.test(value), 'Caracteres no permitidos.').optional(),
});

async function ensureBucket(): Promise<void> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  if (buckets?.some((b) => b.name === BUCKET_NAME)) return;

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
  try {
    const rateLimitResponse = await checkRateLimit(request, uploadLimiter);
    if (rateLimitResponse) return rateLimitResponse;
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autenticado. Token faltante.' }, { status: 401 });
    }
    const token = authHeader.substring(7);
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado. Token inválido.' }, { status: 401 });
    }

    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single();
    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const formData = await request.formData();
    const fileResult = validateUploadFile(formData.get('file'));
    if (!fileResult.ok) return fileResult.response;
    const file = fileResult.data;

    const fields = parseFormFields(
      formData,
      seguimientoFieldsSchema,
      ['vehicleId', 'clientId', 'latitude', 'longitude', 'speed', 'heading', 'notes'],
    );
    if (!fields.ok) return fields.response;

    const {
      vehicleId: rawVehicleId,
      clientId,
      latitude,
      longitude,
      speed,
      heading,
      notes,
    } = fields.data;

    const vehicleId = getSafeStorageSegment(rawVehicleId);
    if (!vehicleId) {
      return NextResponse.json({ error: 'Ruta de almacenamiento no válida.' }, { status: 400 });
    }

    const { data: vehicle, error: vehicleError } = await supabaseAdmin
      .from('vehicles')
      .select('id, company_id')
      .eq('id', vehicleId)
      .single();
    if (vehicleError || !vehicle) {
      return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 });
    }
    if (
      vehicle.company_id !== userProfile.company_id &&
      userProfile.role !== 'super_admin' &&
      userProfile.role !== 'superAdmin'
    ) {
      return NextResponse.json({ error: 'No tienes permisos para este vehículo' }, { status: 403 });
    }

    try {
      await ensureBucket();
    } catch (bucketErr) {
      return internalError('seguimiento/upload-foto ensureBucket', bucketErr);
    }

    const companyId = vehicle.company_id as string;
    const fileExtension =
      file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'jpg';
    const uniqueFileName = `${user.id}-${Date.now()}.${fileExtension}`;
    const fullPath = `companies/${companyId}/vehicles/${vehicleId}/seguimientos/${uniqueFileName}`;
    if (fullPath.includes('../') || fullPath.includes('..\\')) {
      return NextResponse.json({ error: 'Ruta de almacenamiento no válida.' }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const contentType = file.type || 'image/jpeg';
    let uploadError = (
      await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .upload(fullPath, fileBuffer, { contentType, upsert: false })
    ).error;

    if (uploadError && /bucket not found/i.test(uploadError.message)) {
      try {
        await ensureBucket();
        uploadError = (
          await supabaseAdmin.storage
            .from(BUCKET_NAME)
            .upload(fullPath, fileBuffer, { contentType, upsert: false })
        ).error;
      } catch (retryErr) {
        return internalError('seguimiento/upload-foto retry', retryErr);
      }
    }

    if (uploadError) return internalError('seguimiento/upload-foto storage', uploadError);

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(fullPath);
    const { data: seguimiento, error: seguimientoError } = await supabaseAdmin
      .from('seguimientos')
      .insert({
        vehicle_id: vehicleId,
        client_id: clientId ?? null,
        company_id: vehicle.company_id,
        photo_url: publicUrl,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        speed: speed ? parseFloat(speed) : null,
        heading: heading ? parseFloat(heading) : null,
        notes: notes ?? null,
        created_by: user.id,
      })
      .select()
      .single();
    if (seguimientoError) return internalError('seguimiento/upload-foto insert', seguimientoError);

    return NextResponse.json({ success: true, url: publicUrl, seguimiento });
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
    return internalError('seguimiento/upload-foto', error);
  }
}
