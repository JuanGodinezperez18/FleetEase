import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSafeStorageSegment } from '@/lib/security/safe-storage-path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/jpg'];
const BUCKET_NAME = 'vehicle-images';

export async function POST(request: NextRequest) {
  const isDev = process.env.NODE_ENV === 'development';
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'No autenticado. Token faltante.' }, { status: 401 });
    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'No autenticado. Token inválido.' }, { status: 401 });

    const { data: userProfile, error: profileError } = await supabaseAdmin.from('users').select('company_id, role').eq('id', user.id).single();
    if (profileError || !userProfile) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const rawView = formData.get('view') as string;
    const rawVehicleId = formData.get('vehicleId') as string;
    if (!file) return NextResponse.json({ error: 'No se encontró archivo en la solicitud.' }, { status: 400 });
    if (!rawView || !rawVehicleId) return NextResponse.json({ error: 'Faltan parámetros requeridos: view, vehicleId' }, { status: 400 });

    const view = getSafeStorageSegment(rawView);
    const vehicleId = getSafeStorageSegment(rawVehicleId);
    if (!view || !vehicleId) return NextResponse.json({ error: 'Ruta de almacenamiento no válida.' }, { status: 400 });
    if (!ALLOWED_MIME_TYPES.includes(file.type)) return NextResponse.json({ error: `Tipo de archivo no permitido. Permitidos: ${ALLOWED_MIME_TYPES.join(', ')}` }, { status: 415 });
    if (file.size > MAX_SIZE_BYTES) return NextResponse.json({ error: 'Archivo demasiado grande. Límite: 10MB' }, { status: 413 });

    const { data: vehicle, error: vehicleError } = await supabaseAdmin.from('vehicles').select('id, company_id').eq('id', vehicleId).single();
    if (vehicleError || !vehicle) return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 });
    if (vehicle.company_id !== userProfile.company_id && userProfile.role !== 'super_admin') return NextResponse.json({ error: 'No tienes permisos para este vehículo' }, { status: 403 });

    const fileExtension = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'jpg';
    const uniqueFileName = `${user.id}-${view}-${Date.now()}.${fileExtension}`;
    const fullPath = `assignments/${vehicleId}/${uniqueFileName}`;
    if (fullPath.includes('../') || fullPath.includes('..\\')) return NextResponse.json({ error: 'Ruta de almacenamiento no válida.' }, { status: 400 });
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabaseAdmin.storage.from(BUCKET_NAME).upload(fullPath, fileBuffer, { contentType: file.type, upsert: false });
    if (uploadError) {
      if (isDev) console.error('[upload-assignment-photo] Error subiendo a Storage:', uploadError);
      throw uploadError;
    }
    const { data: { publicUrl } } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(fullPath);
    return NextResponse.json({ success: true, url: publicUrl, fullPath });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message.includes('token') || error.message.includes('expired'))) return NextResponse.json({ error: 'No autenticado. Token inválido o faltante.' }, { status: 401 });
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido en el servidor.';
    return NextResponse.json({ error: 'Error al procesar la subida', details: isDev ? errorMessage : undefined }, { status: 500 });
  }
}