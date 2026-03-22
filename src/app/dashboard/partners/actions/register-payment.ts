// app/(dashboard)/partners/actions/register-payment.ts
'use server';

import { NotificationService } from '@/lib/server/notification-service';

/**
 * Registra un pago a un socio y envía notificaciones
 * Esta es una server action que debe ser llamada desde componentes cliente
 */
export async function registerPartnerPayment(
  partnerId: string,
  amount: number,
  partnerName: string,
  companyId: string
) {
  try {
    // 🔔 Notificar al socio sobre el pago recibido
    await NotificationService.notifyPartner(partnerId, {
      type: 'partner_payment',
      title: '💵 Pago Recibido',
      body: `Has recibido un pago de $${amount.toFixed(2)}`,
      url: `/partner/transactions`,
      priority: 'normal'
    });

    // 🔔 Notificar a administradores sobre el pago registrado
    await NotificationService.notifyAdmins(companyId, {
      type: 'partner_payment',
      title: '✅ Pago a Socio Registrado',
      body: `Pago de $${amount.toFixed(2)} a ${partnerName}`,
      url: `/dashboard/partners/${partnerId}/transactions`,
      data: { partnerId, amount: amount.toString() }
    });

    return { success: true };
  } catch (error) {
    console.error('Error en registerPartnerPayment:', error);
    return { success: false, error: 'Error al enviar notificaciones' };
  }
}