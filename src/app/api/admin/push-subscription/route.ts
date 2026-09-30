import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, supabaseAdmin } from '@/lib/admin-api-auth';
import type { Json } from '@/lib/supabase';
import type { Json } from '@/lib/supabase';

interface PushSubscriptionRequest {
  userId: string;
  subscription: PushSubscriptionJSON;
  action: 'subscribe' | 'unsubscribe';
}

export async function POST(request: NextRequest) {
  try {
    const body: PushSubscriptionRequest = await request.json();
    const { userId, subscription, action } = body;

    if (!userId || !action) {
      return NextResponse.json(
        { success: false, message: 'userId y action son obligatorios.' },
        { status: 400 },
      );
    }

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
    const updatedSubs = currentSubs.filter((s): boolean => {
      if (!s || typeof s !== 'object' || Array.isArray(s)) return true;
      const endpoint = s.endpoint;
      return typeof endpoint !== 'string' || endpoint !== subscription.endpoint;
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
