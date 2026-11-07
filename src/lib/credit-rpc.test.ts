import { processCreditPaymentAtomic } from './credit-rpc';
import { supabase } from './supabase-browser';
jest.mock('./supabase-browser', () => ({ supabase: { rpc: jest.fn() } }));
beforeEach(() => {
  jest.useFakeTimers(); jest.setSystemTime(new Date('2026-11-07T05:00:00Z'));
  jest.mocked(supabase.rpc).mockResolvedValue({ data: {}, error: null } as never);
});
afterEach(() => { jest.useRealTimers(); jest.clearAllMocks(); });
it('envía el día de Monterrey cuando el consumidor omite fecha de pago', async () => {
  await processCreditPaymentAtomic({ companyId: 'qa', creditId: 'credit', clientId: 'client', amount: 5 });
  expect(supabase.rpc).toHaveBeenCalledWith('process_credit_payment_atomic', expect.objectContaining({ p_payment_date: '2026-11-06' }));
});
it('conserva una fecha explícita sin convertirla a UTC', async () => {
  await processCreditPaymentAtomic({ companyId: 'qa', creditId: 'credit', clientId: 'client', amount: 5, paymentDate: '2026-11-05' });
  expect(supabase.rpc).toHaveBeenCalledWith('process_credit_payment_atomic', expect.objectContaining({ p_payment_date: '2026-11-05' }));
});
