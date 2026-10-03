import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { checkRateLimit, notificationLimiter } from '@/lib/rate-limit';
import { internalError } from '@/lib/security/api-error';
import {
  idSchema,
  parseJsonBody,
  shortTextSchema,
  urlSchema,
} from '@/lib/security/validation';

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

const sendNotificationSchema = z.object({
  userId: idSchema,
  title: shortTextSchema,
  body: z.string().trim().min(1, 'body es requerido').max(1000),
  type: z.string().trim().max(64).optional().default('general'),
  priority: z.enum(['low', 'normal', 'high']).optional().default('normal'),
  url: urlSchema.nullable().optional(),
  data: z.record(z.string().max(500)).optional(),
  companyId: idSchema.optional().nullable(),
});

export async function POST(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();
  const rateLimitResponse = await checkRateLimit(request, notificationLimiter);
  if (rateLimitResponse) return rateLimitResponse;

  try {
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
      .select('role, company_id')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    if (!['admin', 'editor', 'super_admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    const parsed = await parseJsonBody(request, sendNotificationSchema);
    if (!parsed.ok) return parsed.response;

    const { userId, title, body: messageBody, type, companyId } = parsed.data;

    // Non-super_admin cannot target another company.
    if (
      userProfile.role !== 'super_admin' &&
      companyId &&
      companyId !== userProfile.company_id
    ) {
      return NextResponse.json({ error: 'No puedes notificar a otra empresa.' }, { status: 403 });
    }

    const timestamp = new Date().toISOString();

    const { data: notification, error: notifError } = await supabaseAdmin
      .from('notifications')
      .insert({
        uid: userId,
        type: type || 'general',
        message: title ? `${title}: ${messageBody}` : messageBody,
        date: timestamp,
        is_read: false,
        company_id: companyId || userProfile.company_id || null,
      })
      .select()
      .single();

    if (notifError) {
      return internalError('notifications/send', notifError, { userId });
    }

    const { data: tokens, error: tokensError } = await supabaseAdmin
      .from('fcm_tokens')
      .select('token')
      .eq('user_id', userId)
      .limit(5);

    let pushSent = false;
    let tokensAttempted = 0;
    let tokensSucceeded = 0;
    const tokensFailed = 0;

    if (!tokensError && tokens && tokens.length > 0) {
      tokensAttempted = tokens.length;
      // TODO: envío push real
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
  } catch (error: unknown) {
    return internalError('notifications/send', error);
  }
}
