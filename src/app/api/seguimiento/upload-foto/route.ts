// app/api/seguimiento/upload-foto/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth, adminDb, adminStorage } from '@/lib/server/firebase-admin';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Verificar sesión
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'No autorizado. Sesión no encontrada.' },
        { status: 401 }
      );
    }

    // Verificar token
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    const userId = decodedClaims.uid;
    const userRole = decodedClaims.role;

    // Solo clientes pueden usar este endpoint
    if (userRole !== 'client') {
      return NextResponse.json(
        { error: 'Solo clientes pueden subir fotos de seguimiento.' },
        { status: 403 }
      );
    }

    // Obtener datos del formulario
    const formData = await request.formData();
    const file = formData.get('photo') as File;
    const vehicleId = formData.get('vehicleId') as string;
    const description = formData.get('description') as string;
    const latitude = formData.get('latitude') as string;
    const longitude = formData.get('longitude') as string;

    // VALIDACIÓN: Datos requeridos
    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó ninguna foto.' },
        { status: 400 }
      );
    }

    if (!vehicleId) {
      return NextResponse.json(
        { error: 'vehicleId es requerido.' },
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
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'El archivo es demasiado grande. Máximo 10MB.' },
        { status: 400 }
      );
    }

    // VALIDACIÓN: Descripción no muy larga
    if (description && description.length > 500) {
      return NextResponse.json(
        { error: 'La descripción es demasiado larga. Máximo 500 caracteres.' },
        { status: 400 }
      );
    }

    // Verificar que el vehículo pertenece al cliente
    const vehicleDoc = await adminDb.collection('vehicles').doc(vehicleId).get();

    if (!vehicleDoc.exists) {
      return NextResponse.json(
        { error: 'Vehículo no encontrado.' },
        { status: 404 }
      );
    }

    const vehicleData = vehicleDoc.data();
    const clientDoc = await adminDb.collection('clients')
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (clientDoc.empty) {
      return NextResponse.json(
        { error: 'Cliente no encontrado.' },
        { status: 404 }
      );
    }

    const clientId = clientDoc.docs[0].id;
    const clientData = clientDoc.docs[0].data();

    // Verificar que el vehículo está asignado a este cliente
    if (vehicleData?.clientId !== clientId) {
      return NextResponse.json(
        { error: 'Este vehículo no está asignado a tu cuenta.' },
        { status: 403 }
      );
    }

    // Convertir el archivo a buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generar nombre único para el archivo
    const timestamp = new Date().toISOString();
    const uniqueId = uuidv4();
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `${vehicleId}_${Date.now()}_${uniqueId}.${fileExtension}`;
    const storagePath = `seguimientos/${vehicleId}/${fileName}`;

    // Subir a Firebase Storage
    const bucket = adminStorage.bucket();
    const fileRef = bucket.file(storagePath);

    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
        metadata: {
          uploadedBy: userId,
          clientId: clientId,
          vehicleId: vehicleId,
          timestamp: timestamp,
        },
      },
    });

    // SEGURIDAD: Usar Signed URL en lugar de makePublic()
    // La URL expira en 30 días
    const [signedUrl] = await fileRef.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 días
    });

    // Guardar metadata en Firestore
    const seguimientoData = {
      vehicleId,
      clientId,
      userId,
      clientName: `${clientData.firstname} ${clientData.lastname}`,
      vehicleAlias: vehicleData?.alias || 'N/A',
      photoUrl: signedUrl, // URL firmada en lugar de pública
      storagePath: storagePath, // Guardar path para regenerar URL si expira
      description: description || '',
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      createdAt: timestamp,
      createdBy: userId,
      companyId: vehicleData?.companyId || null,
    };

    const seguimientoRef = await adminDb.collection('seguimientos').add(seguimientoData);

    console.log('✅ Foto de seguimiento subida exitosamente:', {
      seguimientoId: seguimientoRef.id,
      vehicleId,
      clientId,
    });

    return NextResponse.json({
      success: true,
      message: 'Foto de seguimiento subida exitosamente.',
      data: {
        seguimientoId: seguimientoRef.id,
        photoUrl: signedUrl, // URL firmada
        timestamp,
      },
    });
  } catch (error: any) {
    console.error('❌ Error al subir foto de seguimiento:', error);
    return NextResponse.json(
      {
        error: 'Error al subir la foto.',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
