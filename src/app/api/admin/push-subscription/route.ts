import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, supabaseAdmin } from '@/lib/admin-api-auth';
import type { Json } from '@/lib/supabase';
import { idSchema, parseJsonBody } from '@/lib/security/validation';

const pushSubscriptionSchema = z.object({
  userId: idSchema,
  action: z.enum(['subscribe', 'unsubscribe']),
  subscription: z
    .object({
      endpoint: z.string().url().max(2048),
      expirationTime: z.number().nullable().optional(),
      keys: z
        .object({
          p256dh: z.string().max(512),
          auth: z.string().max(512),
        })
        .optional(),
    })
    .passthrough()
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonBody(request, pushSubscriptionSchema);
    if (!parsed.ok) return parsed.response;
    const { userId, subscription, action } = parsed.data;

    // Any authenticated user may manage only their own push subscription.
    const auth = await requireAdmin(request, {
      allowedRoles: ['admin', 'super_admin', 'editor', 'viewer', 'user', 'partner', 'client'],
    });
    if ('error' in auth) return auth.error;

    if (auth.profile.id !== userId && auth.profile.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, message: 'Solo puedes gestionar tu propia suscripción.' },
        { status: 403 },
      );
    }

    if (action === 'subscribe') {
      if (!subscription?.endpoint) {
        return NextResponse.json(
          { success: false, message: 'subscription es obligatoria para suscribirse.' },
          { status: 400 },
        );
      }
      const { error } = await supabaseAdmin
        .from('users')
        .update({ push_subscriptions: [subscription as unknown as Json] })
        .eq('id', userId);

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Suscripción activada' });
    }

    const { data: user, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('push_subscriptions')
      .eq('id', userId)
      .single();

    if (fetchError) throw fetchError;

    const currentSubs = Array.isArray(user?.push_subscriptions) ? user.push_subscriptions : [];
    const endpoint = subscription?.endpoint;
    const updatedSubs = currentSubs.filter((s): boolean => {
      if (!s || typeof s !== 'object' || Array.isArray(s)) return true;
      const ep = s.endpoint;
      return typeof ep !== 'string' || !endpoint || ep !== endpoint;
    });

    const { error } = await supabaseAdmin
      .from('users')
      .update({ push_subscriptions: updatedSubs })
      .eq('id', userId);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Suscripción cancelada' });
  } catch (error) {
    console.error('[Push Subscription API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
