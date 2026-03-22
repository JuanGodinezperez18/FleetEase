
// app/api/upload-inspection/route.ts
import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { admin, adminDb, adminStorage } from '@/lib/server/firebase-admin';

export async function POST(request: NextRequest) {
  const isDev = process.env.NODE_ENV === 'development';
  // 🚧 MODO DESARROLLO: Bypass temporal para preview de Firebase
  const bypassAuth = process.env.NEXT_PUBLIC_BYPASS_SESSION_COOKIE === 'true';

  try {
    console.log('📥 [API Upload Inspection] Recibiendo solicitud...');

    let userCompanyId: string | undefined;
    let userRole: string = 'client';
    let userUid: string = 'dev-user';

    if (!bypassAuth) {
      // Autenticación normal
      const authHeader = request.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        console.error('❌ [API Upload] No se encontró token de autenticación');
        return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
      }

      const token = authHeader.substring(7);
      console.log('🔐 [API Upload] Verificando token...');
      const decodedToken = await admin.auth().verifyIdToken(token);
      userCompanyId = decodedToken.companyId;
      userRole = decodedToken.role;
      userUid = decodedToken.uid;
      console.log(`✅ [API Upload] Usuario autenticado: ${userUid} (${userRole})`);
    } else {
      // 🚧 MODO DESARROLLO: Usar valores por defecto
      console.warn('⚠️ [API Upload] MODO DESARROLLO: Bypass de autenticación activado');
      userCompanyId = undefined; // Permitir cualquier compañía
      userRole = 'superAdmin'; // Dar permisos de superAdmin
    }

    const formData = await request.formData();
    const view = formData.get('view') as string;
    const vehicleId = formData.get('vehicleId') as string;
    const file = formData.get('file') as File;

    console.log(`📋 [API Upload] Datos recibidos - View: ${view}, VehicleId: ${vehicleId}, File size: ${file?.size || 0} bytes`);

    // VALIDACIÓN: Datos requeridos
    if (!view || !vehicleId || !file) {
      return NextResponse.json({ error: 'Faltan datos requeridos (view, vehicleId, file).' }, { status: 400 });
    }

    // VALIDACIÓN: View permitidas
    const validViews = ['front', 'left', 'right', 'rear'];
    if (!validViews.includes(view)) {
      return NextResponse.json({ error: 'Vista inválida. Valores permitidos: front, left, right, rear.' }, { status: 400 });
    }

    // VALIDACIÓN: Formato de archivo
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'El archivo debe ser una imagen.' }, { status: 400 });
    }

    // VALIDACIÓN: Tamaño de archivo (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'El archivo es demasiado grande. Máximo 10MB.' }, { status: 400 });
    }

    // ✅ Validar que el vehículo pertenezca a la compañía del usuario
    const vehicleDoc = await adminDb.collection('vehicles').doc(vehicleId).get();

    if (!vehicleDoc.exists) {
      return NextResponse.json({ error: 'Vehículo no encontrado.' }, { status: 404 });
    }

    const vehicleData = vehicleDoc.data();
    const vehicleCompanyId = vehicleData?.companyId;

    // SuperAdmin puede acceder a cualquier vehículo
    if (userRole !== 'superAdmin' && vehicleCompanyId !== userCompanyId) {
      return NextResponse.json({ error: 'No tienes permisos para acceder a este vehículo.' }, { status: 403 });
    }

    console.log('🖼️ [API Upload] Procesando imagen...');
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log(`📊 [API Upload] Tamaño original: ${(buffer.length / 1024).toFixed(2)} KB`);

    const compressedBuffer = await sharp(buffer)
      .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85, progressive: true, mozjpeg: true })
      .toBuffer();

    console.log(`📊 [API Upload] Tamaño comprimido: ${(compressedBuffer.length / 1024).toFixed(2)} KB`);

    const fileName = `${vehicleId}/${view}-${Date.now()}-${uuidv4()}.jpg`;
    const filePath = `vehicle_inspections/${fileName}`;

    console.log(`☁️ [API Upload] Subiendo a Storage: ${filePath}`);
    const bucket = adminStorage.bucket();
    const fileRef = bucket.file(filePath);

    await fileRef.save(compressedBuffer, {
      metadata: {
        contentType: 'image/jpeg',
        metadata: {
          vehicleId,
          view,
          uploadedBy: userUid,
          uploadedAt: new Date().toISOString(),
          companyId: vehicleCompanyId || userCompanyId
        },
      },
    });

    console.log('🔗 [API Upload] Generando URL firmada...');
    // SEGURIDAD: Usar Signed URL en lugar de makePublic()
    // La URL expira en 7 días (tiempo de retención de inspecciones)
    const [signedUrl] = await fileRef.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 días
    });

    console.log(`✅ [API Upload] Archivo subido exitosamente`);
    return NextResponse.json({
      success: true,
      url: signedUrl, // URL firmada y temporal en lugar de pública
      size: compressedBuffer.length,
      originalSize: buffer.length,
      reduction: Math.round((1 - compressedBuffer.length / buffer.length) * 100),
    });
  } catch (error: unknown) {
    console.error('❌ [API Upload] Error en upload-inspection:', error);

    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });
    }

    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error('❌ [API Upload] Detalles del error:', { errorMessage, errorStack });

    return NextResponse.json({
      error: 'Error al subir imagen',
      details: isDev ? errorMessage : undefined,
      stack: isDev ? errorStack : undefined
    }, { status: 500 });
  }
}
