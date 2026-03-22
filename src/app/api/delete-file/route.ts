import { NextRequest, NextResponse } from 'next/server';
import { admin } from '@/lib/server/firebase-admin';
import { adminDb, adminStorage } from '@/lib/server/firebase-admin';

interface DeleteSuccessResponse {
  success: true;
  deleted: boolean;
  path?: string;
  message?: string;
  cleanedReferences?: number;
}

interface FirebaseError extends Error {
  code?: number | string;
}

function sanitizePath(path: string): string {
  return path.replace(/\.\./g, '').replace(/\/\//g, '/').trim();
}

async function cleanFirestoreReferences(filePath: string, userId: string): Promise<number> {
  let cleanedCount = 0;
  
  try {
    const vehiclesQuery = await adminDb
      .collection('vehicles')
      .where('userId', '==', userId)
      .where('imageUrl', '==', filePath)
      .get();
    
    for (const doc of vehiclesQuery.docs) {
      await doc.ref.update({ imageUrl: null, imageDeletedAt: new Date().toISOString() });
      cleanedCount++;
    }
    
    const docsQuery = await adminDb
      .collection('documents')
      .where('userId', '==', userId)
      .where('fileUrl', '==', filePath)
      .get();
    
    for (const doc of docsQuery.docs) {
      await doc.ref.delete();
      cleanedCount++;
    }
  } catch (error) {
    console.error('⚠️ [API Delete] Error limpiando referencias:', error);
  }
  
  return cleanedCount;
}

async function verifyFileOwnership(filePath: string, userId: string): Promise<boolean> {
  try {
    const file = adminStorage.bucket().file(filePath);
    const [metadata] = await file.getMetadata();
    const uploadedBy = metadata.metadata?.uploadedBy;
    
    if (!uploadedBy) {
      return filePath.includes(userId);
    }
    
    return uploadedBy === userId;
  } catch (error) {
    console.error('⚠️ [API Delete] Error verificando propiedad:', error);
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
    
    if (!fileUrl.startsWith('https://storage.googleapis.com/') && !fileUrl.startsWith('https://firebasestorage.googleapis.com/')) {
      return NextResponse.json({ success: true, deleted: false, message: 'URL ignorada, no es de Firebase Storage.' });
    }
    
    const bucketName = adminStorage.bucket().name;
    let filePath: string;
    if (fileUrl.includes('firebasestorage.googleapis.com')) {
      const match = fileUrl.match(/\/o\/(.+?)(?:\?|$)/);
      if (!match) return NextResponse.json({ error: 'Formato de URL no válido' }, { status: 400 });
      filePath = decodeURIComponent(match[1]);
    } else {
      const prefix = `https://storage.googleapis.com/${bucketName}/`;
      if (!fileUrl.startsWith(prefix)) return NextResponse.json({ error: 'La URL no pertenece al bucket.' }, { status: 400 });
      filePath = decodeURIComponent(fileUrl.substring(prefix.length));
    }
    
    filePath = sanitizePath(filePath);
    
    const isOwner = await verifyFileOwnership(filePath, user.uid);
    if (!isOwner) {
      return NextResponse.json({ error: 'No tienes permisos para eliminar este archivo' }, { status: 403 });
    }
    
    const file = adminStorage.bucket().file(filePath);
    await file.delete();
    
    const cleanedRefs = await cleanFirestoreReferences(fileUrl, user.uid);
    
    const response: DeleteSuccessResponse = { success: true, deleted: true, path: filePath };
    if (cleanedRefs > 0) response.cleanedReferences = cleanedRefs;
    
    return NextResponse.json(response);
    
  } catch (error: unknown) {
    if (error instanceof Error && (error.message.includes('token') || error.message.includes('expired'))) {
        return NextResponse.json({ error: 'No autenticado. Token inválido o faltante.' }, { status: 401 });
    }
    console.error('❌ [API Delete] Error:', error);
    
    const firebaseError = error as FirebaseError;
    if (firebaseError.code === 404 || firebaseError.message?.includes('No such object')) {
      return NextResponse.json({ success: true, deleted: false, message: 'Archivo no encontrado.' });
    }
    
    return NextResponse.json({ error: 'Error al eliminar archivo', details: isDev ? (error as Error).message : 'Contacte al administrador' }, { status: 500 });
  }
}
