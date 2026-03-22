import { NextRequest, NextResponse } from 'next/server';
import { admin } from '@/lib/server/firebase-admin';
import { adminStorage } from '@/lib/server/firebase-admin';

function extractPathFromUrl(fileUrl: string): string | null {
  try {
    const url = new URL(fileUrl);
    
    if (url.hostname === 'firebasestorage.googleapis.com') {
      const pathMatch = url.pathname.match(/\/o\/(.+)/);
      if (pathMatch && pathMatch[1]) return decodeURIComponent(pathMatch[1].split('?')[0]);
    }
    
    if (url.hostname === 'storage.googleapis.com') {
      const pathParts = url.pathname.split('/').slice(2);
      return decodeURIComponent(pathParts.join('/'));
    }
    
    return null;
  } catch (error) {
    console.error('Error extrayendo path de URL:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decodedToken = await admin.auth().verifyIdToken(token);

    if (!decodedToken) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const { fileUrl } = await request.json();
    
    if (!fileUrl) {
      return NextResponse.json({ error: 'fileUrl requerido' }, { status: 400 });
    }

    const filePath = extractPathFromUrl(fileUrl);
    
    if (!filePath) {
      return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
    }

    const bucket = adminStorage.bucket();
    const file = bucket.file(filePath);

    const [exists] = await file.exists();
    if (!exists) {
      return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 });
    }

    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutos
    });

    return NextResponse.json({ url: signedUrl });
  } catch (error: any) {
    console.error('Error generando URL firmada:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
