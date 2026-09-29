import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const BATCH_SIZE = 100;
const LICENSE_WARNING_DAYS = [30, 7];

interface Client {
  id: string;
  user_id: string;
  company_id: string;
  license_expiry: string | null;
}

interface NotificationRecord {
  uid: string;
  type: string;
  message: string;
  date: string;
  is_read: boolean;
  company_id: string;
}

async function verifyAuth(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  return authHeader === expected;
}


async function insertNotificationsBatched(
  notifications: NotificationRecord[],
): Promise<number> {
  let sent = 0;

  for (let i = 0; i < notifications.length; i += BATCH_SIZE) {
    const batch = notifications.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('notifications').insert(batch);

    if (error) {
      console.error('Error inserting notification batch:', error);
    } else {
      sent += batch.length;
    }
  }

  return sent;
}

function daysUntilLicenseExpiry(expiryDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diffMs = expiry.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    console.error('CRON_SECRET is not configured');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 },
    );
  }

  const isAuthorized = await verifyAuth(request);
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let clientsChecked = 0;
  let notificationsSent = 0;

  try {
    const [clientsResult, adminsResult] = await Promise.all([
          supabase
            .from('clients')
            .select('id, user_id, company_id, license_expiry')
            .eq('is_deleted', false)
            .not('license_expiry', 'is', null),
          supabase
            .from('users')
            .select('id, company_id')
            .in('role', ['admin', 'editor']),
        ]);
    
        if (clientsResult.error) {
          console.error('Error fetching clients:', clientsResult.error);
          return NextResponse.json(
            { error: 'Failed to fetch clients', details: clientsResult.error.message },
            { status: 500 },
          );
        }
    
        if (adminsResult.error) {
          console.error('Error fetching admin users:', adminsResult.error);
          return NextResponse.json(
            { error: 'Failed to fetch admin users', details: adminsResult.error.message },
            { status: 500 },
          );
        }
    
        const clients = clientsResult.data;
        const adminIdsByCompany = new Map<string, string[]>();
        for (const admin of adminsResult.data ?? []) {
          const ids = adminIdsByCompany.get(admin.company_id) ?? [];
          ids.push(admin.id);
          adminIdsByCompany.set(admin.company_id, ids);
        }

    clientsChecked = clients?.length ?? 0;
    const allNotifications: NotificationRecord[] = [];

    for (const client of clients as Client[]) {
      if (!client.license_expiry) continue;

      try {
        const daysUntilExpiry = daysUntilLicenseExpiry(client.license_expiry);

        if (
          LICENSE_WARNING_DAYS.includes(daysUntilExpiry)
        ) {
          const daysLabel =
            daysUntilExpiry === 30 ? '30 dias' : '7 dias';

          // Notify the client themselves
          allNotifications.push({
            uid: client.user_id,
            type: 'license_expiry_warning',
            message: `Tu licencia vence en ${daysLabel}. Renuevala a tiempo para evitar la suspension del servicio.`,
            date: new Date().toISOString(),
            is_read: false,
            company_id: client.company_id,
          });

          // Notify admins in the same company
          const adminIds = adminIdsByCompany.get(client.company_id) ?? [];

          for (const adminId of adminIds) {
            allNotifications.push({
              uid: adminId,
              type: 'license_expiry_warning',
              message: `La licencia del cliente vence en ${daysLabel}. Notifique al cliente para gestionar la renovacion.`,
              date: new Date().toISOString(),
              is_read: false,
              company_id: client.company_id,
              });
          }
        }
      } catch (clientError) {
        console.error(
          `Error processing client ${client.id}:`,
          clientError,
        );
      }
    }

    if (allNotifications.length > 0) {
      notificationsSent = await insertNotificationsBatched(allNotifications);
    }

    return NextResponse.json({
      success: true,
      clientsChecked,
      notificationsSent,
    });
  } catch (error) {
    console.error('License check cron job failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        clientsChecked,
        notificationsSent,
      },
      { status: 500 },
    );
  }
}
