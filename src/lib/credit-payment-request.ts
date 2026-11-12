export type CreditPaymentIntent = {
  companyId: string;
  actorId?: string;
  creditId: string;
  clientId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  reference: string;
};

/** Retains unresolved intents for retries while this form remains mounted. */
export function createCreditPaymentRequest() {
  const pending = new Map<string, string>();
  const fingerprint = (payment: CreditPaymentIntent) => JSON.stringify([
    payment.companyId, payment.actorId, payment.creditId, payment.clientId, payment.amount,
    payment.paymentDate, payment.paymentMethod, payment.reference,
  ]);
  return {
    pendingId(payment: CreditPaymentIntent) {
      return pending.get(fingerprint(payment));
    },
    forPayment(payment: CreditPaymentIntent): string {
      const key = fingerprint(payment);
      const existing = pending.get(key);
      if (existing) return existing;
      const id = crypto.randomUUID();
      pending.set(key, id);
      return id;
    },
    confirmed(requestId: string) {
      for (const [fingerprint, id] of pending) {
        if (id === requestId) pending.delete(fingerprint);
      }
    },
  };
}
