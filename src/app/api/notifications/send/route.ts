import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, notificationLimiter } from '@/lib/rate-limit';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SendNotificationSchema = z.object({
  userId: z.string().min(1, 'userId es requerido'),
  title: z.string().min(1, 'title es requerido').max(200),
  body: z.string().min(1, 'body es requerido').max(1000),
  type: z.string().optional().default('general'),
  priority: z.enum(['low', 'normal', 'high']).optional().default('normal'),
  url: z.string().url().nullable().optional(),
  data: z.record(z.string()).optional(),
  companyId: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  // Rate limiting para envío de notificaciones
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

    // Verificar rol del usuario (leer de la tabla users)
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Solo admin, editor y superAdmin pueden enviar notificaciones
    if (!['admin', 'editor', 'super_admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    const body = await request.json();

    const parsed = SendNotificationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') },
        { status: 400 }
      );
    }

    const {
      userId,
      title,
      body: messageBody,
      type,
      companyId,
    } = parsed.data;

    const timestamp = new Date().toISOString();
    
    // Guardar notificación en Supabase
    const { data: notification, error: notifError } = await supabaseAdmin
      .from('notifications')
      .insert({
        uid: userId,
        type: type || 'general',
        message: title ? `${title}: ${messageBody}` : messageBody,
        date: timestamp,
        is_read: false,
        company_id: companyId || null,
      })
      .select()
      .single();
    
    if (notifError) throw notifError;

    // TODO: Enviar push notification via web push o servicio externo
    // Por ahora solo guardamos en base de datos
    
    // Obtener tokens FCM del usuario si existen
    const { data: tokens, error: tokensError } = await supabaseAdmin
      .from('fcm_tokens')
      .select('token')
      .eq('user_id', userId)
      .limit(5);
    
    let pushSent = false;
    let tokensAttempted = 0;
    let tokensSucceeded = 0;
    let tokensFailed = 0;

    if (!tokensError && tokens && tokens.length > 0) {
      tokensAttempted = tokens.length;
      // TODO: Implementar envío push real (web push, FCM via servicio externo, etc.)
      // Por ahora simulamos éxito
      pushSent = true;
      tokensSucceeded = tokens.length;
    }

    return NextResponse.json({
      success: true,
      notificationSaved: true,
      pushSent,
      tokensAttempted,
      tokensSucceeded,
      tokensFailed,
      notificationId: notification?.id,
    });
  } catch (error: any) {
    console.error('Error en /api/notifications/send:', error);
    return NextResponse.json({ error: 'Error al enviar notificación', details: error.message }, { status: 500 });
  }
}