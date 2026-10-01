import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/resend';
import type { Database } from '@/lib/supabase';
import { getStripe } from '@/lib/stripe';

type SupabaseAdminClient = ReturnType<typeof createClient<Database>>;

let supabaseClient: SupabaseAdminClient | null = null;
let reminderSupabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabase(): SupabaseAdminClient {
  if (supabaseClient) return supabaseClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase admin configuration is missing.');
  }

  supabaseClient = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return supabaseClient;
}

function getReminderSupabase() {
  if (reminderSupabaseClient) return reminderSupabaseClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase admin configuration is missing.');
  }

  reminderSupabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return reminderSupabaseClient;
}

const REMINDER_DAYS = [7, 3, 1, 0];
const DAY_MS = 86400000;

function authorized(request: NextRequest) {
  const auth = request.headers.get('authorization');
  return Boolean(process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`);
}

function reminderKey(daysRemaining: number) {
  return daysRemaining === 0 ? 'expires-today' : `expires-in-${daysRemaining}-days`;
}

function renderEmail(companyName: string, plan: string, periodEnd: Date, daysRemaining: number) {
  const formattedDate = new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'long',
    timeZone: 'America/Monterrey',
  }).format(periodEnd);

  const title = daysRemaining === 0
    ? 'Tu suscripción vence hoy'
    : `Tu suscripción vence en ${daysRemaining} ${daysRemaining === 1 ? 'día' : 'días'}`;

  const billingUrl = `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/settings/billing`;

  return {
    subject: `FleetEase — ${title}`,
    html: `<!doctype html><html lang="es"><body style="margin:0;background:#080a0f;color:#fff;font-family:Arial,sans-serif"><div style="max-width:620px;margin:0 auto;padding:48px 24px"><div style="font-size:24px;font-weight:700;margin-bottom:36px">Fleet<span style="color:#d7ff3f">Ease</span></div><div style="background:#11151c;border:1px solid #252a32;border-radius:18px;padding:32px"><div style="color:#d7ff3f;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">Aviso de suscripción</div><h1 style="font-size:30px;line-height:1.15;margin:14px 0 18px">${title}</h1><p style="color:#a7adb8;line-height:1.7;margin:0 0 22px">Hola. La suscripción de <strong style="color:#fff">${companyName}</strong> al plan <strong style="color:#fff">${plan}</strong> termina el <strong style="color:#fff">${formattedDate}</strong>.</p><p style="color:#a7adb8;line-height:1.7;margin:0 0 28px">Para evitar interrupciones en el acceso a FleetEase, revisa tu suscripción y actualiza el método de pago si es necesario.</p><a href="${billingUrl}" style="display:inline-block;background:#d7ff3f;color:#080a0f;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:999px">Administrar suscripción</a></div><p style="color:#555d69;font-size:12px;line-height:1.6;margin-top:24px">Este correo fue enviado automáticamente por FleetEase.</p></div></body></html>`,
    text: `${title}. La suscripción de ${companyName} (${plan}) termina el ${formattedDate}. Administra tu suscripción en ${billingUrl}`,
  };
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'RESEND_API_KEY is not configured' }, { status: 500 });

  const now = new Date();
  let companiesChecked = 0;
  let remindersSent = 0;
  let remindersSkipped = 0;
  const errors: string[] = [];

  try {
    const supabase = getSupabase();
    const reminderSupabase = getReminderSupabase();
    const { data: subscriptions, error } = await supabase
      .from('companies')
      .select('id, name, plan, stripe_subscription_id')
      .not('stripe_subscription_id', 'is', null)
      .in('subscription_status', ['active', 'trialing', 'past_due']);

    if (error) throw error;
    companiesChecked = subscriptions?.length ?? 0;

    const stripe = getStripe();

    for (const subscription of subscriptions ?? []) {
      try {
        const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id!);
        const currentPeriodEnd = stripeSubscription.items.data[0]?.current_period_end;
        if (!currentPeriodEnd) throw new Error('Stripe subscription has no current period end');

        const periodEnd = new Date(currentPeriodEnd * 1000);
        const daysRemaining = Math.ceil((periodEnd.getTime() - now.getTime()) / DAY_MS);
        if (!REMINDER_DAYS.includes(daysRemaining)) continue;

        const key = reminderKey(daysRemaining);

        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('name, plan')
          .eq('id', subscription.id)
          .single();
        if (companyError || !company) throw companyError || new Error('Company not found');

        const { data: admins, error: adminError } = await supabase
          .from('users')
          .select('email')
          .eq('company_id', subscription.id)
          .eq('is_deleted', false)
          .eq('role', 'admin');
        if (adminError) throw adminError;

        const recipients = (admins ?? []).map((u) => u.email).filter(Boolean);
        if (!recipients.length) {
          remindersSkipped++;
          continue;
        }

        // Claim this reminder only after all data needed to send it has been validated.
        // The unique constraint on (company_id, reminder_key, period_end) prevents duplicates.
        const { data: reservation, error: reservationError } = await reminderSupabase
          .from('subscription_email_reminders')
          .insert({ company_id: subscription.id, reminder_key: key, period_end: periodEnd.toISOString() })
          .select('id')
          .maybeSingle();

        if (reservationError) {
          if (reservationError.code === '23505') {
            remindersSkipped++;
            continue;
          }
          throw reservationError;
        }
        if (!reservation) continue;

        const email = renderEmail(
          company.name || 'tu empresa',
          subscription.plan || company.plan || 'FleetEase',
          periodEnd,
          daysRemaining,
        );

        try {
          await sendEmail({
            to: recipients,
            subject: email.subject,
            html: email.html,
            text: email.text,
          });
          remindersSent++;
        } catch (sendError) {
          // Release the claim when delivery fails so the next cron execution can retry.
          await reminderSupabase
            .from('subscription_email_reminders')
            .delete()
            .eq('id', reservation.id);
          throw sendError;
        }
      } catch (companyError) {
        const message = companyError instanceof Error ? companyError.message : String(companyError);
        errors.push(`${subscription.id}: ${message}`);
        console.error('[Subscription expiry cron]', subscription.id, companyError);
      }
    }

    return NextResponse.json({ success: true, companiesChecked, remindersSent, remindersSkipped, errors });
  } catch (error) {
    console.error('[Subscription expiry cron] failed:', error);
    return NextResponse.json({
      success: false,
      companiesChecked,
      remindersSent,
      remindersSkipped,
      errors: [...errors, error instanceof Error ? error.message : String(error)],
    }, { status: 500 });
  }
}
