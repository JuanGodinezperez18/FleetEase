import { z } from 'zod';

const intentSchema = z.object({
  companyId: z.string(),
  actorId: z.string().optional(),
  creditId: z.string(),
  clientId: z.string(),
  amount: z.number().positive(),
  paymentDate: z.string(),
  paymentMethod: z.string(),
  reference: z.string(),
});
const requestSchema = z.object({ id: z.string().uuid(), payment: intentSchema });

export type CreditPaymentIntent = z.infer<typeof intentSchema>;
export type PendingCreditPayment = z.infer<typeof requestSchema>;

const storageKey = 'fleetease:pending-credit-payments:v1';

function fingerprint(payment: CreditPaymentIntent) {
  return JSON.stringify([
    payment.companyId, payment.actorId, payment.creditId, payment.clientId, payment.amount,
    payment.paymentDate, payment.paymentMethod, payment.reference,
  ]);
}

export function createCreditPaymentRequest(getStorage?: () => Storage) {
  let pending: PendingCreditPayment[] = [];
  let persistenceFailed = false;

  function read() {
    if (!getStorage || persistenceFailed) return pending;
    try {
      const raw = getStorage().getItem(storageKey);
      const stored: unknown = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(stored)) return [];
      return stored.flatMap(entry => {
        const parsed = requestSchema.safeParse(entry);
        return parsed.success ? [parsed.data] : [];
      });
    } catch {
      return pending;
    }
  }

  function write(requests: PendingCreditPayment[]) {
    pending = requests;
    if (!getStorage) return;
    try {
      const storage = getStorage();
      if (requests.length) storage.setItem(storageKey, JSON.stringify(requests));
      else storage.removeItem(storageKey);
      persistenceFailed = false;
    } catch {
      persistenceFailed = true;
    }
  }

  return {
    list(companyId: string, actorId: string) {
      return read().filter(({ payment }) => payment.companyId === companyId && payment.actorId === actorId);
    },
    pendingId(payment: CreditPaymentIntent) {
      return read().find(request => fingerprint(request.payment) === fingerprint(payment))?.id;
    },
    forPayment(payment: CreditPaymentIntent): string {
      const requests = read();
      const existing = requests.find(request => fingerprint(request.payment) === fingerprint(payment));
      if (existing) return existing.id;
      const id = crypto.randomUUID();
      write([...requests, { id, payment }]);
      return id;
    },
    confirmed(requestId: string) {
      write(read().filter(request => request.id !== requestId));
    },
  };
}
