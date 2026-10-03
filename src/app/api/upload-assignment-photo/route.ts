import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSafeStorageSegment } from '@/lib/security/safe-storage-path';
import { checkRateLimit, uploadLimiter } from '@/lib/rate-limit';
import { internalError } from '@/lib/security/api-error';
import {
  parseFormFields,
  validateUploadFile,
  vehicleUploadFieldsSchema,
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

const BUCKET_NAME = 'vehicle-images';

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

    const fields = parseFormFields(formData, vehicleUploadFieldsSchema, ['vehicleId', 'view']);
    if (!fields.ok) return fields.response;
    const { vehicleId: rawVehicleId, view: rawView } = fields.data;

    const view = getSafeStorageSegment(rawView);
    const vehicleId = getSafeStorageSegment(rawVehicleId);
    if (!view || !vehicleId) {
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
      userProfile.role !== 'super_admin'
    ) {
      return NextResponse.json({ error: 'No tienes permisos para este vehículo' }, { status: 403 });
    }

    const companyId = vehicle.company_id as string;
    const fileExtension =
      file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'jpg';
    const uniqueFileName = `${user.id}-${view}-${Date.now()}.${fileExtension}`;
    const fullPath = `companies/${companyId}/vehicles/${vehicleId}/assignments/${uniqueFileName}`;
    if (fullPath.includes('../') || fullPath.includes('..\\')) {
      return NextResponse.json({ error: 'Ruta de almacenamiento no válida.' }, { status: 400 });
    }
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(fullPath, fileBuffer, { contentType: file.type || 'image/jpeg', upsert: false });
    if (uploadError) return internalError('upload-assignment-photo', uploadError);
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(fullPath);
    return NextResponse.json({ success: true, url: publicUrl, fullPath });
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
    return internalError('upload-assignment-photo', error);
  }
}
