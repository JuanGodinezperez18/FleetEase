
// functions/src/cron/check-licenses.ts
import * as admin from 'firebase-admin';
import { sendNotification } from '../notifications/notification-service';
import { differenceInDays } from 'date-fns';

export async function checkLicensesExpiring(): Promise<void> {
  const db = admin.firestore();
  
  try {
    // LÍMITE: Procesar máximo 5000 clientes activos
    const clientsSnapshot = await db
      .collection('clients')
      .where('isDeleted', '==', false)
      .limit(5000)
      .get();

    console.log(`📊 Revisando licencias de ${clientsSnapshot.size} clientes...`);
    let notificationsSent = 0;

    for (const clientDoc of clientsSnapshot.docs) {
      const client = clientDoc.data();

      if (!client.licenseExpiryDate) continue;

      const expiryDate = client.licenseExpiryDate.toDate();
      const daysUntilExpiry = differenceInDays(expiryDate, new Date());

      // Notificar 30 días antes
      if (daysUntilExpiry === 30 || daysUntilExpiry === 7) {
        console.log(`⚠️ Licencia por vencer: ${client.firstname} ${client.lastname} (${daysUntilExpiry} días)`);

        // Notificar al cliente
        if (client.userId) {
          await sendNotification({
            userId: client.userId,
            title: '📄 Licencia por Vencer',
            body: `Tu licencia de conducir vence en ${daysUntilExpiry} días. Recuerda renovarla.`,
            type: 'license_expiring',
            priority: daysUntilExpiry <= 7 ? 'high' : 'normal',
            url: '/client',
            companyId: client.companyId,
          });
          notificationsSent++;
        }

        // Notificar a admins (máximo 50 admins por compañía)
        const adminsSnapshot = await db
          .collection('users')
          .where('companyId', '==', client.companyId)
          .where('role', 'in', ['admin', 'editor'])
          .limit(50)
          .get();

        for (const adminDoc of adminsSnapshot.docs) {
          await sendNotification({
            userId: adminDoc.id,
            title: '📄 Licencia por Vencer',
            body: `La licencia de ${client.firstname} ${client.lastname} vence en ${daysUntilExpiry} días`,
            type: 'license_expiring',
            priority: 'normal',
            url: `/dashboard/clients/${clientDoc.id}`,
            companyId: client.companyId,
          });
          notificationsSent++;
        }
      }
    }

    console.log(`✅ Revisión de licencias completada. ${notificationsSent} notificaciones enviadas.`);
  } catch (error) {
    console.error('❌ Error en checkLicensesExpiring:', error);
    throw error;
  }
}

    