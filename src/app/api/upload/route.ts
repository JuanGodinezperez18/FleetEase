import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { admin } from '@/lib/server/firebase-admin';
import { adminDb, adminStorage } from '@/lib/server/firebase-admin';

type AllowedFolder = 
  | 'vehicle_images'
  | 'driver_documents'
  | 'financial_receipts'
  | 'general_documents'
  | 'contract_templates';

const ALLOWED_FOLDERS: readonly AllowedFolder[] = [
  'vehicle_images',
  'driver_documents',
  'financial_receipts',
  'general_documents',
  'contract_templates'
] as const;

const ALLOWED_MIME_TYPES: Record<AllowedFolder, string[]> = {
  vehicle_images: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/jpg'],
  driver_documents: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
  financial_receipts: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
  general_documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  contract_templates: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
};

const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

function isValidFolder(folder: unknown): folder is AllowedFolder {
  return typeof folder === 'string' && ALLOWED_FOLDERS.includes(folder as AllowedFolder);
}

function sanitizeFileName(fileName: string): string {
  return fileName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .toLowerCase();
}

export async function POST(request: NextRequest) {
  const isDev = process.env.NODE_ENV === 'development';
  if(isDev) console.log('[API Upload] Recibida solicitud de subida.');

  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autenticado. Token faltante.' }, { status: 401 });
    }
    const token = authHeader.substring(7);
    
    const decodedToken = await admin.auth().verifyIdToken(token);
    const user = { uid: decodedToken.uid, companyId: decodedToken.companyId, role: decodedToken.role };

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = formData.get('folder') as string;
    const entityId = formData.get('entityId') as string | undefined;
    const originalName = formData.get('originalName') as string || file?.name || 'unknown';

    if (!file) {
      return NextResponse.json({ error: 'No se encontró archivo en la solicitud.' }, { status: 400 });
    }
    
    if (!isValidFolder(folder)) {
      return NextResponse.json({ error: `Carpeta inválida. Debe ser una de: ${ALLOWED_FOLDERS.join(', ')}` }, { status: 400 });
    }
    
    const allowedMimes = ALLOWED_MIME_TYPES[folder];
    if (!allowedMimes.includes(file.type)) {
        return NextResponse.json({ error: `Tipo de archivo no permitido. Permitidos: ${allowedMimes.join(', ')}` }, { status: 415 });
    }
    
    if (file.size > MAX_SIZE_BYTES) {
        return NextResponse.json({ error: `Archivo demasiado grande. Límite: ${MAX_SIZE_MB}MB` }, { status: 413 });
    }

    let companyId = user.companyId;
    if (user.role === 'superAdmin' && entityId && entityId !== 'unassigned') {
        const docRef = adminDb.collection('vehicles').doc(entityId); 
        try {
            const docSnap = await docRef.get();
            if (docSnap.exists) {
                companyId = docSnap.data()?.companyId;
            }
        } catch (e) {
            if(isDev) console.log('[API Upload] No se encontró entidad para determinar compañía, usando la del usuario.');
        }
    }
    if (!companyId) {
        return NextResponse.json({ error: 'No se pudo determinar la empresa para la subida.' }, { status: 400 });
    }

    const fileExtension = originalName.split('.').pop()?.toLowerCase() || 'bin';
    const uniqueFileName = `${user.uid}-${uuidv4()}.${fileExtension}`;
    
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    const safeEntityId = entityId && entityId !== 'unassigned' ? entityId : 'unassigned';
    
    let pathPrefix = '';
    switch(folder) {
        case 'vehicle_images': pathPrefix = `companies/${companyId}/vehicles/${safeEntityId}/images`; break;
        case 'driver_documents': pathPrefix = `companies/${companyId}/clients/${safeEntityId}/documents`; break;
        case 'financial_receipts': pathPrefix = `companies/${companyId}/receipts/${year}/${month}`; break;
        case 'contract_templates': pathPrefix = `companies/${companyId}/templates`; break;
        default: pathPrefix = `companies/${companyId}/general/${year}/${month}`; break;
    }
    
    const fullPath = `${pathPrefix}/${uniqueFileName}`;
    const fileRef = adminStorage.bucket().file(fullPath);

    const metadata = {
      contentType: file.type,
      metadata: {
        originalName: sanitizeFileName(originalName),
        uploadedBy: user.uid,
        uploadedAt: now.toISOString(),
        companyId,
      }
    };
    
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    
    if(isDev) console.log(`[API Upload] Subiendo a Storage en path: ${fullPath}`);
    await fileRef.save(fileBuffer, { metadata });
    if(isDev) console.log('[API Upload] Archivo guardado en Storage.');

    const bucketName = adminStorage.bucket().name;
    const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(fullPath)}?alt=media`;

    return NextResponse.json({ success: true, downloadUrl, fullPath });
    
  } catch (error: unknown) {
    if (error instanceof Error && (error.message.includes('token') || error.message.includes('expired'))) {
        return NextResponse.json({ error: 'No autenticado. Token inválido o faltante.' }, { status: 401 });
    }
    if (isDev) console.error('❌ [API Upload] Error CRÍTICO en la ruta:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido en el servidor.';
    return NextResponse.json({ error: 'Error al procesar la subida', details: isDev ? errorMessage : undefined }, { status: 500 });
  }
}
