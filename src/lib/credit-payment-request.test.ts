import { createCreditPaymentRequest } from './credit-payment-request';
const payment = { companyId: 'qa', creditId: 'credit', clientId: 'client', amount: 4, paymentDate: '2026-11-07', paymentMethod: 'Efectivo', reference: 'QA' };
it('conserva la misma clave cuando se reintenta tras una respuesta perdida', () => {
  const request = createCreditPaymentRequest();
  expect(request.forPayment(payment)).toBe(request.forPayment({ ...payment }));
});
it('un pago nuevo idéntico recibe otra clave después de confirmar el anterior', () => {
  const request = createCreditPaymentRequest(); const first = request.forPayment(payment);
  request.confirmed(first);
  expect(request.forPayment(payment)).not.toBe(first);
});
it('volver al payload pendiente recupera su clave aunque se hayan editado campos', () => {
  const request = createCreditPaymentRequest(); const first = request.forPayment(payment);
  expect(request.forPayment({ ...payment, amount: 5 })).not.toBe(first);
  expect(request.forPayment(payment)).toBe(first);
});

it('confirmar otra intención no olvida un pago anterior sin respuesta', () => {
  const request = createCreditPaymentRequest(); const first = request.forPayment(payment);
  const other = request.forPayment({ ...payment, amount: 5 });
  request.confirmed(other);
  expect(request.forPayment(payment)).toBe(first);
});

it('sólo recupera el reintento para la empresa y el usuario originales', () => {
  const request = createCreditPaymentRequest();
  const intent = { ...payment, actorId: 'admin' };
  expect(request.pendingId(intent)).toBeUndefined();
  const id = request.forPayment(intent);
  expect(request.pendingId(intent)).toBe(id);
  expect(request.pendingId({ ...intent, actorId: 'other-admin' })).toBeUndefined();
  expect(request.pendingId({ ...intent, companyId: 'other-company' })).toBeUndefined();
  request.confirmed(id);
  expect(request.pendingId(intent)).toBeUndefined();
});
