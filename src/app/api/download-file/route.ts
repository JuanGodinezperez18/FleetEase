import { NextRequest, NextResponse } from 'next/server';
import { admin } from '@/lib/server/firebase-admin';
import { adminStorage } from '@/lib/server/firebase-admin';

interface FirebaseError extends Error {
  code?: number | string;
}

function getPathFromUrl(fileUrl: string): string {
    const bucketName = adminStorage.bucket().name;
    
    if (fileUrl.includes('firebasestorage.googleapis.com')) {
      const match = fileUrl.match(new RegExp(`/o/(.+?)(?=\\?|$)`));
      if (match && match[1]) return decodeURIComponent(match[1]);
    }
    
    if (fileUrl.startsWith(`https://storage.googleapis.com/${bucketName}/`)) {
        const prefix = `https://storage.googleapis.com/${bucketName}/`;
        return decodeURIComponent(fileUrl.substring(prefix.length));
    }
    
    throw new Error('URL de Firebase Storage no válida o no reconocida.');
}

async function verifyFileOwnership(filePath: string, userId: string): Promise<boolean> {
  try {
    const file = adminStorage.bucket().file(filePath);
    const [metadata] = await file.getMetadata();
    const uploadedBy = metadata.metadata?.uploadedBy;
    
    if (uploadedBy) return uploadedBy === userId;

    if (filePath.includes(userId)) {
      return true;
    }

    return false;
  } catch (error) {
    const firebaseError = error as FirebaseError;
    if (firebaseError.code === 404) {
      console.warn(`[API Download] Intento de acceso a archivo no existente: ${filePath}`);
    } else {
      console.error('⚠️ [API Download] Error verificando propiedad:', error);
    }
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
    const decodedToken = await admin.auth().verifyIdToken(token);
    const user = { uid: decodedToken.uid };
    
    const body = await request.json();
    const { fileUrl } = body;
    
    if (!fileUrl || typeof fileUrl !== 'string') {
      return NextResponse.json({ error: 'URL de archivo inválida o faltante' }, { status: 400 });
    }

    const filePath = getPathFromUrl(fileUrl);
    
    const isOwner = await verifyFileOwnership(filePath, user.uid);
    if (!isOwner) {
       return NextResponse.json({ error: 'No tienes permisos para acceder a este archivo.' }, { status: 403 });
    }

    const file = adminStorage.bucket().file(filePath);
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutos
    });
    
    return NextResponse.json({ success: true, signedUrl });

  } catch (error: unknown) {
    if (error instanceof Error && (error.message.includes('token') || error.message.includes('expired'))) {
        return NextResponse.json({ error: 'No autenticado. Token inválido o faltante.' }, { status: 401 });
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('❌ [API Download] Error:', error);
    
    if (errorMessage.includes('No tienes permisos')) return NextResponse.json({ error: errorMessage }, { status: 403 });
    if (errorMessage.includes('URL de Firebase Storage no válida')) return NextResponse.json({ error: errorMessage }, { status: 400 });
    
    return NextResponse.json({ error: 'Error al procesar la solicitud.', details: isDev ? errorMessage : undefined }, { status: 500 });
  }
}
