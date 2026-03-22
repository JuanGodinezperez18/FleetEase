// app/(dashboard)/clients/actions/update-balance.ts
import { NotificationService } from '@/lib/server/notification-service';

export async function updateClientBalance(
  clientId: string,
  newBalance: number,
  previousBalance: number,
  companyId: string
) {
  // ... lógica de actualización ...

  const difference = newBalance - previousBalance;
  const isIncrease = difference > 0;

  // 🔔 Notificar al cliente sobre cambio en balance
  await NotificationService.notifyClient(clientId, {
    type: 'balance_updated',
    title: isIncrease ? '📈 Saldo Actualizado' : '📉 Saldo Actualizado',
    body: `Tu saldo cambió ${isIncrease ? 'aumentó' : 'disminuyó'} en $${Math.abs(difference).toFixed(2)}. Nuevo saldo: $${newBalance.toFixed(2)}`,
    url: `/client`,
    priority: 'normal',
  });
}