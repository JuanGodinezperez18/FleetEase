import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, notificationLimiter } from '@/lib/rate-limit';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export async function POST(request: NextRequest) {
  // Rate limiting estricto para broadcasts (solo 2 por minuto)
  const rateLimitResponse = await checkRateLimit(request, notificationLimiter);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // 🔐 AUTENTICACIÓN: Verificar sesión via Supabase
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autenticado. Token faltante.' }, { status: 401 });
    }
    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado. Token inválido.' }, { status: 401 });
    }

    // Verificar rol del usuario
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Solo admin y superAdmin pueden enviar notificaciones broadcast
    if (!['admin', 'super_admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Permisos insuficientes - Solo administradores pueden enviar broadcasts' }, { status: 403 });
    }

    const {
      title,
      message,
      recipientType,
      selectedUsers,
      sendPush,
      companyId,
    } = await request.json();

    let recipientUserIds: string[] = [];

    // Consultar usuarios según tipo de destinatario
    switch (recipientType) {
      case 'all':
        const { data: allUsers, error: allUsersError } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('company_id', companyId);
        if (!allUsersError && allUsers) {
          recipientUserIds = allUsers.map(u => u.id);
        }
        break;

      case 'admins':
        const { data: admins, error: adminsError } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('company_id', companyId)
          .in('role', ['admin', 'super_admin']);
        if (!adminsError && admins) {
          recipientUserIds = admins.map(u => u.id);
        }
        break;

      case 'editors':
        const { data: editors, error: editorsError } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('company_id', companyId)
          .eq('role', 'editor');
        if (!editorsError && editors) {
          recipientUserIds = editors.map(u => u.id);
        }
        break;

      case 'partners':
        const { data: partners, error: partnersError } = await supabaseAdmin
          .from('partners')
          .select('user_id')
          .eq('company_id', companyId);
        if (!partnersError && partners) {
          recipientUserIds = partners
            .map(p => p.user_id)
            .filter((id): id is string => Boolean(id));
        }
        break;

      case 'clients':
        const { data: clients, error: clientsError } = await supabaseAdmin
          .from('clients')
          .select('user_id')
          .eq('company_id', companyId);
        if (!clientsError && clients) {
          recipientUserIds = clients
            .map(c => c.user_id)
            .filter((id): id is string => Boolean(id));
        }
        break;

      case 'specific':
        recipientUserIds = selectedUsers || [];
        break;
    }

    // Guardar notificaciones en batches
    const timestamp = new Date().toISOString();
    const MAX_BATCH_SIZE = 500;
    const userIdChunks = chunkArray(recipientUserIds, MAX_BATCH_SIZE);

    const batchPromises = userIdChunks.map(async (chunk) => {
      const notifications = chunk.map(userId => ({
        uid: userId,
        type: 'announcement',
        message: title ? `${title}: ${message}` : message,
        date: timestamp,
        is_read: false,
        company_id: companyId,
      }));

      const { error } = await supabaseAdmin
        .from('notifications')
        .insert(notifications);
      
      if (error) throw error;
    });

    await Promise.all(batchPromises);

    let pushSentCount = 0;

    if (sendPush && recipientUserIds.length > 0) {
      // TODO: Implementar envío push real (web push, FCM via servicio externo)
      // Por ahora solo simulamos
      pushSentCount = recipientUserIds.length;
    }

    return NextResponse.json({
      success: true,
      recipientCount: recipientUserIds.length,
      pushSent: pushSentCount,
    });
  } catch (error) {
    console.error('Error al enviar notificación:', error);
    return NextResponse.json({ error: 'Error al enviar notificación' }, { status: 500 });
  }
}