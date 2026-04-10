// app/api/upload-inspection/route.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/logger';
import { checkRateLimit, uploadLimiter } from '@/lib/rate-limit';

export const runtime = 'nodejs';

/**
 * API para subir imágenes de inspección
 *
 * Comprime la imagen con sharp y la sube a Supabase Storage.
 * Requiere autenticación.
 *
 * @endpoint POST /api/upload-inspection
 */
export async function POST(request: NextRequest) {
  // Rate limiting para uploads
  const rateLimitResponse = await checkRateLimit(request, uploadLimiter);
  if (rateLimitResponse) return rateLimitResponse;

  const isDev = process.env.NODE_ENV === 'development';

  try {
    logger.info('[API Upload Inspection] Recibiendo solicitud...');

    // Verificar autenticación con Supabase (cookies es async en Next.js 15+)
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
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      logger.error('[API Upload] No autenticado', sessionError);
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const userId = session.user.id;

    // Obtener perfil del usuario para verificar rol y compañía
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role, company_id')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile) {
      logger.error('[API Upload] Error obteniendo perfil', profileError);
      return NextResponse.json({ error: 'Error obteniendo perfil' }, { status: 500 });
    }

    const userRole = userProfile.role;
    const userCompanyId = userProfile.company_id;

    logger.info(`[API Upload] Usuario autenticado: ${userId} (${userRole})`);

    // Procesar FormData
    const formData = await request.formData();
    const view = formData.get('view') as string;
    const vehicleId = formData.get('vehicleId') as string;
    const file = formData.get('file') as File;

    logger.info(`[API Upload] Datos recibidos - View: ${view}, VehicleId: ${vehicleId}`);

    // VALIDACIÓN: Datos requeridos
    if (!view || !vehicleId || !file) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos (view, vehicleId, file).' },
        { status: 400 }
      );
    }

    // VALIDACIÓN: View permitidas
    const validViews = ['front', 'left', 'right', 'rear'];
    if (!validViews.includes(view)) {
      return NextResponse.json(
        { error: 'Vista inválida. Valores permitidos: front, left, right, rear.' },
        { status: 400 }
      );
    }

    // VALIDACIÓN: Formato de archivo
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'El archivo debe ser una imagen.' },
        { status: 400 }
      );
    }

    // VALIDACIÓN: Tamaño de archivo (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'El archivo es demasiado grande. Máximo 10MB.' },
        { status: 400 }
      );
    }

    // Validar que el vehículo pertenezca a la compañía del usuario
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('company_id, client_id')
      .eq('id', vehicleId)
      .single();

    if (vehicleError || !vehicle) {
      return NextResponse.json(
        { error: 'Vehículo no encontrado.' },
        { status: 404 }
      );
    }

    // SuperAdmin puede acceder a cualquier vehículo
    if (userRole !== 'super_admin' && vehicle.company_id !== userCompanyId) {
      return NextResponse.json(
        { error: 'No tienes permisos para acceder a este vehículo.' },
        { status: 403 }
      );
    }

    logger.info('[API Upload] Procesando imagen...');

    // Procesar imagen con sharp
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    logger.info(`[API Upload] Tamaño original: ${(buffer.length / 1024).toFixed(2)} KB`);

    const compressedBuffer = await sharp(buffer)
      .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85, progressive: true, mozjpeg: true })
      .toBuffer();

    logger.info(`[API Upload] Tamaño comprimido: ${(compressedBuffer.length / 1024).toFixed(2)} KB`);

    // Generar nombre único
    const fileName = `${view}-${Date.now()}-${uuidv4()}.jpg`;
    const filePath = `companies/${vehicle.company_id}/vehicles/${vehicleId}/inspections/${fileName}`;

    // Subir a Supabase Storage
    logger.info(`[API Upload] Subiendo a Storage: ${filePath}`);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('inspection-images')
      .upload(filePath, compressedBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Error al subir: ${uploadError.message}`);
    }

    // Generar URL firmada (válida por 7 días)
    const { data: signedUrlData } = await supabase.storage
      .from('inspection-images')
      .createSignedUrl(filePath, 7 * 24 * 60 * 60);

    if (!signedUrlData) {
      throw new Error('Error generando URL firmada');
    }

    logger.info('[API Upload] Archivo subido exitosamente');

    return NextResponse.json({
      success: true,
      url: signedUrlData.signedUrl,
      path: filePath,
      size: compressedBuffer.length,
      originalSize: buffer.length,
      reduction: Math.round((1 - compressedBuffer.length / buffer.length) * 100),
    });

  } catch (error: unknown) {
    logger.error('[API Upload] Error:', error);

    return NextResponse.json({
      error: 'Error al subir imagen',
    }, { status: 500 });
  }
}
