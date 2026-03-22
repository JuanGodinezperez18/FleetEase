
// functions/src/cron/check-maintenance.ts
import * as admin from 'firebase-admin';
import { sendNotification } from '../notifications/notification-service';

/**
 * Helper para procesar arrays en batches
 * Evita saturar Firebase con demasiadas peticiones simultáneas
 */
async function processInBatches<T>(
  items: T[],
  processor: (item: T) => Promise<void>,
  batchSize: number = 100
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(processor));
    // Pequeña pausa entre batches para evitar rate limiting
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

export async function checkMaintenanceDue(): Promise<void> {
  const db = admin.firestore();
  const startTime = Date.now();

  try {
    // LÍMITE: Procesar máximo 5000 vehículos activos
    const vehiclesSnapshot = await db
      .collection('vehicles')
      .where('sold', '==', false)
      .limit(5000)
      .get();

    console.log(`📊 Revisando ${vehiclesSnapshot.size} vehículos...`);
    
    const notificationTasks: Array<() => Promise<void>> = [];
    let vehiclesNeedingNotification = 0;

    for (const vehicleDoc of vehiclesSnapshot.docs) {
      const vehicle = vehicleDoc.data();
      const kmToNext = (vehicle.lastMaintenanceMileage || 0) +
                       (vehicle.maintenanceInterval || 5000) -
                       (vehicle.currentMileage || 0);

      const notifications: Array<{
        userId: string;
        title: string;
        body: string;
        type: string;
        priority: 'normal' | 'high';
        url: string;
        companyId?: string;
      }> = [];

      // Mantenimiento vencido (km negativos)
      if (kmToNext < 0) {
        console.log(`⚠️ Mantenimiento vencido: ${vehicle.alias} (${Math.abs(kmToNext)} km pasados)`);
        vehiclesNeedingNotification++;

        // Notificar al cliente
        if (vehicle.clientId) {
          const clientDoc = await db.collection('clients').doc(vehicle.clientId).get();
          const clientData = clientDoc.data();

          if (clientData?.userId) {
            notifications.push({
              userId: clientData.userId,
              title: '🔧 Mantenimiento Requerido',
              body: `Tu vehículo ${vehicle.alias} requiere mantenimiento urgente (${Math.abs(kmToNext)} km pasados)`,
              type: 'vehicle_maintenance_due',
              priority: 'high',
              url: '/client/vehicle',
              companyId: vehicle.companyId,
            });
          }
        }

        // Notificar al socio
        if (vehicle.partnerId) {
          const partnerDoc = await db.collection('partners').doc(vehicle.partnerId).get();
          const partnerData = partnerDoc.data();

          if (partnerData?.userId) {
            notifications.push({
              userId: partnerData.userId,
              title: '🔧 Mantenimiento Vencido',
              body: `Vehículo ${vehicle.alias} requiere mantenimiento (${Math.abs(kmToNext)} km pasados)`,
              type: 'vehicle_maintenance_due',
              priority: 'high',
              url: '/partner/vehicles',
              companyId: vehicle.companyId,
            });
          }
        }

        // Notificar a admins (máximo 50 por compañía)
        const adminsSnapshot = await db
          .collection('users')
          .where('companyId', '==', vehicle.companyId)
          .where('role', 'in', ['admin', 'editor'])
          .limit(50)
          .get();

        for (const adminDoc of adminsSnapshot.docs) {
          notifications.push({
            userId: adminDoc.id,
            title: '⚠️ Mantenimiento Vencido',
            body: `${vehicle.alias} requiere mantenimiento urgente`,
            type: 'vehicle_maintenance_due',
            priority: 'high',
            url: `/dashboard/vehicles/${vehicleDoc.id}`,
            companyId: vehicle.companyId,
          });
        }
      }
      // Mantenimiento próximo (< 500 km)
      else if (kmToNext < 500) {
        console.log(`⏰ Mantenimiento próximo: ${vehicle.alias} (${kmToNext} km restantes)`);
        vehiclesNeedingNotification++;

        // Solo notificar a cliente y socio (no spam a admins)
        if (vehicle.clientId) {
          const clientDoc = await db.collection('clients').doc(vehicle.clientId).get();
          const clientData = clientDoc.data();

          if (clientData?.userId) {
            notifications.push({
              userId: clientData.userId,
              title: '⏰ Mantenimiento Próximo',
              body: `Tu vehículo ${vehicle.alias} requiere mantenimiento en ${kmToNext} km`,
              type: 'vehicle_maintenance_upcoming',
              priority: 'normal',
              url: '/client/vehicle',
              companyId: vehicle.companyId,
            });
          }
        }

        if (vehicle.partnerId) {
          const partnerDoc = await db.collection('partners').doc(vehicle.partnerId).get();
          const partnerData = partnerDoc.data();

          if (partnerData?.userId) {
            notifications.push({
              userId: partnerData.userId,
              title: '⏰ Mantenimiento Próximo',
              body: `${vehicle.alias} necesitará mantenimiento en ${kmToNext} km`,
              type: 'vehicle_maintenance_upcoming',
              priority: 'normal',
              url: '/partner/vehicles',
              companyId: vehicle.companyId,
            });
          }
        }
      }

      // Agregar todas las notificaciones de este vehículo
      for (const notification of notifications) {
        notificationTasks.push(() => sendNotification(notification));
      }
    }

    // Ejecutar notificaciones en paralelo con batching
    console.log(`🚀 Enviando ${notificationTasks.length} notificaciones en paralelo...`);
    await processInBatches(notificationTasks, task => task(), 100);

    const totalTime = Date.now() - startTime;
    console.log(`✅ Revisión completada. ${vehiclesNeedingNotification} vehículos requieren atención. ${totalTime}ms`);
  } catch (error) {
    console.error('❌ Error en checkMaintenanceDue:', error);
    throw error;
  }
}

    