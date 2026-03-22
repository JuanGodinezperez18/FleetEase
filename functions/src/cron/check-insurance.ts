
// functions/src/cron/check-insurance.ts
import * as admin from 'firebase-admin';
import { sendNotification } from '../notifications/notification-service';
import { differenceInDays } from 'date-fns';

export async function checkInsuranceExpiring(): Promise<void> {
  const db = admin.firestore();
  
  try {
    // LÍMITE: Procesar máximo 5000 vehículos no vendidos
    const vehiclesSnapshot = await db
      .collection('vehicles')
      .where('sold', '==', false)
      .limit(5000)
      .get();

    console.log(`📊 Revisando seguros de ${vehiclesSnapshot.size} vehículos...`);
    let notificationsSent = 0;

    for (const vehicleDoc of vehiclesSnapshot.docs) {
      const vehicle = vehicleDoc.data();

      if (!vehicle.insuranceExpiryDate) continue;

      const expiryDate = vehicle.insuranceExpiryDate.toDate();
      const daysUntilExpiry = differenceInDays(expiryDate, new Date());

      // Notificar 7 días antes
      if (daysUntilExpiry === 7) {
        console.log(`⚠️ Seguro por vencer: ${vehicle.alias} (${daysUntilExpiry} días)`);

        // Notificar a admins (máximo 50 admins por compañía)
        const adminsSnapshot = await db
          .collection('users')
          .where('companyId', '==', vehicle.companyId)
          .where('role', 'in', ['admin', 'editor'])
          .limit(50)
          .get();

        for (const adminDoc of adminsSnapshot.docs) {
          await sendNotification({
            userId: adminDoc.id,
            title: '🛡️ Seguro por Vencer',
            body: `El seguro de ${vehicle.alias} vence en 7 días`,
            type: 'insurance_expiring',
            priority: 'high',
            url: `/dashboard/vehicles/${vehicleDoc.id}`,
            companyId: vehicle.companyId,
          });
          notificationsSent++;
        }

        // Notificar al socio
        if (vehicle.partnerId) {
          const partnerDoc = await db.collection('partners').doc(vehicle.partnerId).get();
          const partnerData = partnerDoc.data();
          
          if (partnerData?.userId) {
            await sendNotification({
              userId: partnerData.userId,
              title: '🛡️ Seguro por Vencer',
              body: `El seguro de tu vehículo ${vehicle.alias} vence en 7 días`,
              type: 'insurance_expiring',
              priority: 'high',
              url: '/partner/vehicles',
              companyId: vehicle.companyId,
            });
            notificationsSent++;
          }
        }
      }
    }

    console.log(`✅ Revisión de seguros completada. ${notificationsSent} notificaciones enviadas.`);
  } catch (error) {
    console.error('❌ Error en checkInsuranceExpiring:', error);
    throw error;
  }
}

    