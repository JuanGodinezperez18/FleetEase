import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const BATCH_SIZE = 100;

interface Vehicle {
  id: string;
  plate: string;
  company_id: string;
  client_id: string;
  partner_id: string | null;
  current_mileage: number | null;
  last_maintenance_mileage: number | null;
  maintenance_interval: number | null;
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

async function insertNotificationsBatched(notifications: NotificationRecord[]): Promise<number> {
  let sent = 0;
  for (let i = 0; i < notifications.length; i += BATCH_SIZE) {
    const batch = notifications.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('notifications').insert(batch);
    if (error) console.error('Error inserting notification batch:', error);
    else sent += batch.length;
  }
  return sent;
}

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    console.error('CRON_SECRET is not configured');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  if (!(await verifyAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let vehiclesChecked = 0;
  let vehiclesNeedingAttention = 0;
  let notificationsSent = 0;

  try {
    const { data: vehicles, error: fetchError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('is_deleted', false)
      .eq('sold', false);

    if (fetchError) {
      console.error('Error fetching vehicles:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch vehicles', details: fetchError.message }, { status: 500 });
    }

    vehiclesChecked = vehicles?.length ?? 0;

    // El intervalo vigente es propiedad de la empresa. Nunca usamos un
    // fallback fijo ni una copia histórica del vehículo para este cálculo.
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, maintenance_interval')
      .eq('is_deleted', false);

    if (companiesError) {
      console.error('Error fetching company maintenance intervals:', companiesError);
      return NextResponse.json({ error: 'Failed to fetch company maintenance settings', details: companiesError.message }, { status: 500 });
    }

    const companyIntervals = new Map<string, number>();
    for (const company of companies ?? []) {
      if (typeof company.maintenance_interval === 'number' && company.maintenance_interval > 0) {
        companyIntervals.set(company.id, company.maintenance_interval);
      }
    }

    const allNotifications: NotificationRecord[] = [];

    for (const vehicle of vehicles as Vehicle[]) {
      try {
        const interval = companyIntervals.get(vehicle.company_id);
        if (!interval) {
          console.warn(`Skipping maintenance check for vehicle ${vehicle.id}: company ${vehicle.company_id} has no valid maintenance interval configured.`);
          continue;
        }

        const lastMileage = vehicle.last_maintenance_mileage ?? 0;
        const currentMileage = vehicle.current_mileage ?? 0;
        const kmToNext = lastMileage + interval - currentMileage;

        if (kmToNext < 0) {
          const adminUsers = await getAdminUsers(vehicle.company_id);
          const message = `Mantenimiento vencido para el vehiculo ${vehicle.plate}. Kilometraje actual: ${currentMileage} km.`;

          allNotifications.push({
            uid: vehicle.client_id,
            type: 'vehicle_maintenance_due',
            message,
            date: new Date().toISOString(),
            is_read: false,
            company_id: vehicle.company_id,
          });

          if (vehicle.partner_id) {
            allNotifications.push({
              uid: vehicle.partner_id,
              type: 'vehicle_maintenance_due',
              message,
              date: new Date().toISOString(),
              is_read: false,
              company_id: vehicle.company_id,
            });
          }

          for (const adminId of adminUsers) {
            allNotifications.push({
              uid: adminId,
              type: 'vehicle_maintenance_due',
              message: `Mantenimiento vencido para el vehiculo ${vehicle.plate} (${vehicle.company_id}). Requiere atencion inmediata.`,
              date: new Date().toISOString(),
              is_read: false,
              company_id: vehicle.company_id,
            });
          }

          vehiclesNeedingAttention++;
        } else if (kmToNext < 500) {
          const message = `Mantenimiento proximo para el vehiculo ${vehicle.plate}. Faltan ${kmToNext} km.`;

          allNotifications.push({
            uid: vehicle.client_id,
            type: 'vehicle_maintenance_due',
            message,
            date: new Date().toISOString(),
            is_read: false,
            company_id: vehicle.company_id,
          });

          if (vehicle.partner_id) {
            allNotifications.push({
              uid: vehicle.partner_id,
              type: 'vehicle_maintenance_due',
              message,
              date: new Date().toISOString(),
              is_read: false,
              company_id: vehicle.company_id,
            });
          }

          vehiclesNeedingAttention++;
        }
      } catch (vehicleError) {
        console.error(`Error processing vehicle ${vehicle.id}:`, vehicleError);
      }
    }

    if (allNotifications.length > 0) {
      notificationsSent = await insertNotificationsBatched(allNotifications);
    }

    return NextResponse.json({ success: true, vehiclesChecked, vehiclesNeedingAttention, notificationsSent });
  } catch (error) {
    console.error('Maintenance check cron job failed:', error);
    return NextResponse.json({ success: false, error: 'Internal server error', vehiclesChecked, vehiclesNeedingAttention, notificationsSent }, { status: 500 });
  }
}
