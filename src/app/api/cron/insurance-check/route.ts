import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const BATCH_SIZE = 100;
const INSURANCE_WARNING_DAYS = 7;

interface Vehicle {
  id: string;
  plate: string;
  company_id: string;
  partner_id: string | null;
  insurance_expiry_date: string | null;
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

async function getAdminUsers(companyId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('company_id', companyId)
    .in('role', ['admin', 'editor']);

  if (error) {
    console.error('Error fetching admin users:', error);
    return [];
  }

  return data?.map((u) => u.id) ?? [];
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

function daysUntilInsuranceExpiry(expiryDate: string): number {
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

  let vehiclesChecked = 0;
  let notificationsSent = 0;

  try {
    const { data: vehicles, error: fetchError } = await supabase
      .from('vehicles')
      .select('id, plate, company_id, partner_id, insurance_expiry_date')
      .eq('is_deleted', false)
      .eq('sold', false)
      .not('insurance_expiry_date', 'is', null);

    if (fetchError) {
      console.error('Error fetching vehicles:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch vehicles', details: fetchError.message },
        { status: 500 },
      );
    }

    vehiclesChecked = vehicles?.length ?? 0;
    const allNotifications: NotificationRecord[] = [];

    for (const vehicle of vehicles as Vehicle[]) {
      if (!vehicle.insurance_expiry_date) continue;

      try {
        const daysUntilExpiry = daysUntilInsuranceExpiry(
          vehicle.insurance_expiry_date,
        );

        if (daysUntilExpiry === INSURANCE_WARNING_DAYS) {
          const adminIds = await getAdminUsers(vehicle.company_id);

          for (const adminId of adminIds) {
            allNotifications.push({
              uid: adminId,
              type: 'insurance_expiry_warning',
              message: `El seguro del vehiculo ${vehicle.plate} vence en ${INSURANCE_WARNING_DAYS} dias. Renuevelo a tiempo para evitar sanciones.`,
              date: new Date().toISOString(),
              is_read: false,
              company_id: vehicle.company_id,
            });
          }

          if (vehicle.partner_id) {
            allNotifications.push({
              uid: vehicle.partner_id,
              type: 'insurance_expiry_warning',
              message: `El seguro del vehiculo ${vehicle.plate} vence en ${INSURANCE_WARNING_DAYS} dias. Por favor, gestione la renovacion.`,
              date: new Date().toISOString(),
              is_read: false,
              company_id: vehicle.company_id,
            });
          }
        }
      } catch (vehicleError) {
        console.error(
          `Error processing vehicle ${vehicle.id}:`,
          vehicleError,
        );
      }
    }

    if (allNotifications.length > 0) {
      notificationsSent = await insertNotificationsBatched(allNotifications);
    }

    return NextResponse.json({
      success: true,
      vehiclesChecked,
      notificationsSent,
    });
  } catch (error) {
    console.error('Insurance check cron job failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        vehiclesChecked,
        notificationsSent,
      },
      { status: 500 },
    );
  }
}
