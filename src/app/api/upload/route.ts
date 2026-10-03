import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import { getSafeStorageSegment } from '@/lib/security/safe-storage-path';
import { checkRateLimit, uploadLimiter } from '@/lib/rate-limit';
import { internalError } from '@/lib/security/api-error';
import {
  generalUploadFieldsSchema,
  MAX_UPLOAD_BYTES,
  parseFormFields,
  uploadFolderSchema,
  validateUploadFile,
  type ParseResult,
} from '@/lib/security/validation';
import type { z } from 'zod';

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

type AllowedFolder = z.infer<typeof uploadFolderSchema>;

const ALLOWED_MIME_TYPES: Record<AllowedFolder, readonly string[]> = {
  vehicle_images: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/jpg'],
  driver_documents: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
  financial_receipts: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
  general_documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  contract_templates: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  company_logos: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
};

function getBucketName(folder: AllowedFolder): string {
  switch (folder) {
    case 'vehicle_images':
      return 'vehicle-images';
    case 'driver_documents':
      return 'driver-documents';
    case 'financial_receipts':
      return 'financial-receipts';
    case 'general_documents':
      return 'general-documents';
    case 'contract_templates':
      return 'contract-templates';
    case 'company_logos':
      return 'company-logos';
  }
}

function isSuperAdmin(role: string | null | undefined): boolean {
  return role === 'super_admin' || role === 'superAdmin';
}

async function ensureBucket(folder: AllowedFolder, bucketName: string): Promise<void> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  if (buckets?.some((b) => b.name === bucketName)) return;

  const mimeTypes = ALLOWED_MIME_TYPES[folder];
  const { error } = await supabaseAdmin.storage.createBucket(bucketName, {
    public: true,
    fileSizeLimit: MAX_UPLOAD_BYTES,
    allowedMimeTypes: mimeTypes.length > 0 ? [...mimeTypes] : undefined,
  });

  if (error && !/already exists|duplicate/i.test(error.message)) {
    throw error;
  }
}

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

    const fields = parseFormFields(formData, generalUploadFieldsSchema, [
      'folder',
      'entityId',
      'originalName',
    ]);
    if (!fields.ok) return fields.response;
    const { folder, entityId: rawEntityId, originalName: rawOriginalName } = fields.data;

    const allowedMimes = ALLOWED_MIME_TYPES[folder];
    const fileResult: ParseResult<File> = validateUploadFile(
      formData.get('file'),
      allowedMimes,
      MAX_UPLOAD_BYTES,
    );
    if (!fileResult.ok) return fileResult.response;
    const file = fileResult.data;

    const originalName = rawOriginalName || file.name || 'unknown';

    const entityId =
      rawEntityId && rawEntityId !== 'unassigned'
        ? getSafeStorageSegment(rawEntityId, 'entityId')
        : 'unassigned';
    if (rawEntityId && rawEntityId !== 'unassigned' && !entityId) {
      return NextResponse.json({ error: 'Identificador de entidad no válido.' }, { status: 400 });
    }

    let companyId = userProfile.company_id as string | null;

    if (folder === 'company_logos' && entityId && entityId !== 'unassigned') {
      if (isSuperAdmin(userProfile.role)) {
        companyId = entityId;
      } else if (userProfile.role === 'admin') {
        if (userProfile.company_id && userProfile.company_id !== entityId) {
          return NextResponse.json(
            { error: 'No puedes subir el logotipo de otra empresa.' },
            { status: 403 },
          );
        }
        companyId = entityId;
      } else {
        return NextResponse.json(
          { error: 'Solo administradores pueden subir el logotipo de la empresa.' },
          { status: 403 },
        );
      }
    } else if (isSuperAdmin(userProfile.role) && entityId && entityId !== 'unassigned') {
      if (folder === 'driver_documents') {
        const { data: client, error: clientError } = await supabaseAdmin
          .from('clients')
          .select('company_id')
          .eq('id', entityId)
          .single();
        if (clientError || !client?.company_id) {
          return NextResponse.json(
            { error: 'No se pudo determinar la empresa del cliente para la subida.' },
            { status: 400 },
          );
        }
        companyId = client.company_id;
      } else if (folder === 'vehicle_images') {
        const { data: vehicle, error: vehicleError } = await supabaseAdmin
          .from('vehicles')
          .select('company_id')
          .eq('id', entityId)
          .single();
        if (vehicleError || !vehicle?.company_id) {
          return NextResponse.json(
            { error: 'No se pudo determinar la empresa del vehículo para la subida.' },
            { status: 400 },
          );
        }
        companyId = vehicle.company_id;
      }
    }

    if (!companyId) {
      return NextResponse.json(
        {
          error:
            'No se pudo determinar la empresa para la subida. Verifica que tu usuario tenga una empresa asignada.',
        },
        { status: 400 },
      );
    }

    const fileExtension =
      originalName.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'bin';
    const uniqueFileName = `${user.id}-${uuidv4()}.${fileExtension}`;
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    let pathPrefix = '';
    switch (folder) {
      case 'vehicle_images':
        pathPrefix = `companies/${companyId}/vehicles/${entityId}/images`;
        break;
      case 'driver_documents':
        pathPrefix = `companies/${companyId}/clients/${entityId}/documents`;
        break;
      case 'financial_receipts':
        pathPrefix = `companies/${companyId}/receipts/${year}/${month}`;
        break;
      case 'contract_templates':
        pathPrefix = `companies/${companyId}/templates`;
        break;
      case 'company_logos':
        pathPrefix = `companies/${companyId}/branding`;
        break;
      default:
        pathPrefix = `companies/${companyId}/general/${year}/${month}`;
        break;
    }

    const fullPath = `${pathPrefix}/${uniqueFileName}`;
    const bucketName = getBucketName(folder);
    if (fullPath.includes('../') || fullPath.includes('..\\')) {
      return NextResponse.json({ error: 'Ruta de almacenamiento no válida.' }, { status: 400 });
    }

    try {
      await ensureBucket(folder, bucketName);
    } catch (bucketErr) {
      return internalError('API Upload ensureBucket', bucketErr, { bucketName });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const contentType = file.type || 'application/octet-stream';
    let uploadError = (
      await supabaseAdmin.storage
        .from(bucketName)
        .upload(fullPath, fileBuffer, { contentType, upsert: false })
    ).error;

    if (uploadError && /bucket not found/i.test(uploadError.message)) {
      try {
        await ensureBucket(folder, bucketName);
        uploadError = (
          await supabaseAdmin.storage
            .from(bucketName)
            .upload(fullPath, fileBuffer, { contentType, upsert: false })
        ).error;
      } catch (retryErr) {
        return internalError('API Upload retry', retryErr, { bucketName });
      }
    }

    if (uploadError) {
      return internalError('API Upload storage', uploadError, { bucketName, fullPath });
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(bucketName).getPublicUrl(fullPath);
    return NextResponse.json({ success: true, downloadUrl: publicUrl, fullPath });
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
    return internalError('API Upload', error);
  }
}
