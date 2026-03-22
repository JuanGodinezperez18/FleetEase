// app/(dashboard)/credits/actions/register-payment.ts
'use server';

import { NotificationService } from '@/lib/server/notification-service';

/**
 * Registra un pago de crédito y envía notificaciones
 * Esta es una server action que debe ser llamada desde componentes cliente
 */
export async function registerCreditPayment(
  creditId: string,
  amount: number,
  clientId: string,
  clientName: string,
  companyId: string
) {
  try {
    // 🔔 Notificar al cliente sobre el pago recibido
    await NotificationService.notifyClient(clientId, {
      type: 'credit_payment_received',
      title: '💰 Pago Recibido',
      body: `Tu pago de $${amount.toFixed(2)} ha sido registrado correctamente`,
      url: `/client/payments`,
      priority: 'normal',
      data: { creditId, amount: amount.toString() }
    });

    // 🔔 Notificar a administradores sobre el nuevo pago
    await NotificationService.notifyAdmins(companyId, {
      type: 'credit_payment_received',
      title: '✅ Nuevo Pago Registrado',
      body: `${clientName} realizó un pago de $${amount.toFixed(2)}`,
      url: `/dashboard/credits/${creditId}`,
      data: { creditId, clientId, amount: amount.toString() }
    });

    return { success: true };
  } catch (error) {
    console.error('Error en registerCreditPayment:', error);
    return { success: false, error: 'Error al enviar notificaciones' };
  }
}