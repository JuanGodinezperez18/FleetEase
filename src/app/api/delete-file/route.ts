import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { getSafeStoragePath } from '@/lib/security/safe-storage-path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface DeleteSuccessResponse {
  success: true;
  deleted: boolean;
  path?: string;
  message?: string;
  cleanedReferences?: number;
}

async function cleanSupabaseReferences(fileUrl: string, userId: string): Promise<number> {
  let cleanedCount = 0;
  
  try {
    const { data: vehicles, error: vehiclesError } = await supabaseAdmin
      .from('vehicles')
      .select('id')
      .or(`image_url.eq.${fileUrl},circulation_card_url.eq.${fileUrl},insurance_policy_document_url.eq.${fileUrl}`)
      .eq('company_id', (await supabaseAdmin.from('users').select('company_id').eq('id', userId).single()).data?.company_id || '');
    
    if (!vehiclesError && vehicles) {
      for (const vehicle of vehicles) {
        const updateData: Record<string, null> = {};
        if (vehicle.image_url === fileUrl) updateData.image_url = null;
        if (vehicle.circulation_card_url === fileUrl) updateData.circulation_card_url = null;
        if (vehicle.insurance_policy_document_url === fileUrl) updateData.insurance_policy_document_url = null;
        if (Object.keys(updateData).length > 0) {
          await supabaseAdmin.from('vehicles').update(updateData).eq('id', vehicle.id);
          cleanedCount++;
        }
      }
    }

    const { data: clients, error: clientsError } = await supabaseAdmin
      .from('clients')
      .select('id')
      .or(`photo_url.eq.${fileUrl},ine_url.eq.${fileUrl},license_image_url.eq.${fileUrl}`)
      .eq('company_id', (await supabaseAdmin.from('users').select('company_id').eq('id', userId).single()).data?.company_id || '');
    
    if (!clientsError && clients) {
      for (const client of clients) {
        const updateData: Record<string, null> = {};
        if (client.photo_url === fileUrl) updateData.photo_url = null;
        if (client.ine_url === fileUrl) updateData.ine_url = null;
        if (client.license_image_url === fileUrl) updateData.license_image_url = null;
        if (Object.keys(updateData).length > 0) {
          await supabaseAdmin.from('clients').update(updateData).eq('id', client.id);
          cleanedCount++;
        }
      }
    }

    await supabaseAdmin.from('documents').delete().eq('file_url', fileUrl);
  } catch (error) {
    console.error('[API Delete] Error limpiando referencias:', error);
  }
  
  return cleanedCount;
}

async function verifyFileOwnership(filePath: string, userId: string): Promise<boolean> {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('users')
      .select('company_id, role')
      .eq('id', userId)
      .single();

    if (error || !profile) return false;
    if (profile.role === 'super_admin') return true;

    const segments = filePath.split('/');
    return segments.includes(userId) || Boolean(
      profile.company_id && segments.includes(profile.company_id)
    );
  } catch (error) {
    console.error('[API Delete] Error verificando propiedad:', error);
    return false;
  }
}

const DeleteFileSchema = z.object({
  fileUrl: z.string().url('URL de archivo invalida'),
});

export async function POST(request: NextRequest) {
  const isDev = process.env.NODE_ENV === 'development';

  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autenticado. Token faltante.' }, { status: 401 });
    }
    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado. Token invalido.' }, { status: 401 });
    }

    const parsed = DeleteFileSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos invalidos', details: parsed.error.errors.map(e => e.message).join(', ') },
        { status: 400 }
      );
    }

    const fileUrl = parsed.data.fileUrl;
    const parsedUrl = new URL(fileUrl);
    const configuredSupabaseHost = new URL(supabaseUrl).hostname;

    if (
      parsedUrl.protocol !== 'https:' ||
      parsedUrl.hostname !== configuredSupabaseHost ||
      !parsedUrl.pathname.includes('/storage/v1/object/public/')
    ) {
      return NextResponse.json({ success: true, deleted: false, message: 'URL ignorada, no es de Supabase Storage.' });
    }

    const match = parsedUrl.pathname.match(/\/storage\/v1\/object\/public\/[^\/]+\/(.+)/);
    if (!match) return NextResponse.json({ error: 'Formato de URL no valido' }, { status: 400 });

    const filePath = getSafeStoragePath(match[1]);
    if (!filePath) {
      return NextResponse.json({ error: 'Ruta de archivo no valida.' }, { status: 400 });
    }

    const isOwner = await verifyFileOwnership(filePath, user.id);
    if (!isOwner) {
      return NextResponse.json({ error: 'No tienes permisos para eliminar este archivo' }, { status: 403 });
    }

    const { error: deleteError } = await supabaseAdmin.storage
      .from('documents')
      .remove([filePath]);
    
    if (deleteError) {
      console.error('[API Delete] Error eliminando de Storage:', deleteError);
      if (deleteError.message.includes('not found')) {
        return NextResponse.json({ success: true, deleted: false, message: 'Archivo no encontrado.' });
      }
      throw deleteError;
    }
    
    const cleanedRefs = await cleanSupabaseReferences(fileUrl, user.id);
    const response: DeleteSuccessResponse = { success: true, deleted: true, path: filePath };
    if (cleanedRefs > 0) response.cleanedReferences = cleanedRefs;
    
    return NextResponse.json(response);
  } catch (error: unknown) {
    if (error instanceof Error && (error.message.includes('token') || error.message.includes('expired'))) {
      return NextResponse.json({ error: 'No autenticado. Token invalido o faltante.' }, { status: 401 });
    }
    console.error('[API Delete] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    if (errorMessage.includes('not found')) {
      return NextResponse.json({ success: true, deleted: false, message: 'Archivo no encontrado.' });
    }
    return NextResponse.json({ error: 'Error al eliminar archivo', details: isDev ? errorMessage : 'Contacte al administrador' }, { status: 500 });
  }
}