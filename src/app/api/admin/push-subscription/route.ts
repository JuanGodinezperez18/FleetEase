import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface PushSubscriptionRequest {
  userId: string;
  subscription: PushSubscriptionJSON;
  action: 'subscribe' | 'unsubscribe';
}

export async function POST(request: NextRequest) {
  try {
    const body: PushSubscriptionRequest = await request.json();
    const { userId, subscription, action } = body;

    if (action === 'subscribe') {
      const { error } = await supabaseAdmin
        .from('users')
        .update({
          push_subscriptions: [subscription],
        })
        .eq('id', userId);

      if (error) throw error;

      return NextResponse.json({ success: true, message: 'Suscripción activada' });
    } else {
      // Para unsubscribe, necesitamos obtener la suscripción actual y removerla
      const { data: user, error: fetchError } = await supabaseAdmin
        .from('users')
        .select('push_subscriptions')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;

      const currentSubs = user?.push_subscriptions || [];
      const updatedSubs = currentSubs.filter(
        (s: any) => s.endpoint !== subscription.endpoint
      );

      const { error } = await supabaseAdmin
        .from('users')
        .update({ push_subscriptions: updatedSubs })
        .eq('id', userId);

      if (error) throw error;

      return NextResponse.json({ success: true, message: 'Suscripción cancelada' });
    }
  } catch (error) {
    console.error('[Push Subscription API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}