import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

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
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .toLowerCase();
}

function getBucketName(folder: AllowedFolder): string {
  switch (folder) {
    case 'vehicle_images': return 'vehicle-images';
    case 'driver_documents': return 'driver-documents';
    case 'financial_receipts': return 'financial-receipts';
    case 'general_documents': return 'general-documents';
    case 'contract_templates': return 'contract-templates';
    default: return 'general-documents';
  }
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
    
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado. Token inválido.' }, { status: 401 });
    }

    // Obtener perfil del usuario para company_id y role
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single();
    
    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

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

    let companyId = userProfile.company_id;

    // Super Admins may not have a company_id of their own. Resolve the tenant
    // from the entity being uploaded instead of assuming every entityId is a
    // vehicle. Client documents pass a client ID; vehicle images pass a vehicle ID.
    if (userProfile.role === 'super_admin' && entityId && entityId !== 'unassigned') {
      if (folder === 'driver_documents') {
        const { data: client, error: clientError } = await supabaseAdmin
          .from('clients')
          .select('company_id')
          .eq('id', entityId)
          .single();

        if (clientError || !client?.company_id) {
          return NextResponse.json({ error: 'No se pudo determinar la empresa del cliente para la subida.' }, { status: 400 });
        }

        companyId = client.company_id;
      } else if (folder === 'vehicle_images') {
        const { data: vehicle, error: vehicleError } = await supabaseAdmin
          .from('vehicles')
          .select('company_id')
          .eq('id', entityId)
          .single();

        if (vehicleError || !vehicle?.company_id) {
          return NextResponse.json({ error: 'No se pudo determinar la empresa del vehículo para la subida.' }, { status: 400 });
        }

        companyId = vehicle.company_id;
      }
    }

    if (!companyId) {
        return NextResponse.json({ error: 'No se pudo determinar la empresa para la subida.' }, { status: 400 });
    }

    const fileExtension = originalName.split('.').pop()?.toLowerCase() || 'bin';
    const uniqueFileName = `${user.id}-${uuidv4()}.${fileExtension}`;
    
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
    const bucketName = getBucketName(folder);
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    if(isDev) console.log(`[API Upload] Subiendo a Storage bucket: ${bucketName}, path: ${fullPath}`);

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(fullPath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });
    
    if (uploadError) {
      console.error('❌ [API Upload] Error subiendo a Storage:', uploadError);
      throw uploadError;
    }
    
    if(isDev) console.log('[API Upload] Archivo guardado en Storage.');

    // Generar URL pública
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(bucketName)
      .getPublicUrl(fullPath);

    return NextResponse.json({ success: true, downloadUrl: publicUrl, fullPath });
    
  } catch (error: unknown) {
    if (error instanceof Error && (error.message.includes('token') || error.message.includes('expired'))) {
        return NextResponse.json({ error: 'No autenticado. Token inválido o faltante.' }, { status: 401 });
    }
    if (isDev) console.error('❌ [API Upload] Error CRÍTICO en la ruta:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido en el servidor.';
    return NextResponse.json({ error: 'Error al procesar la subida', details: isDev ? errorMessage : undefined }, { status: 500 });
  }
}