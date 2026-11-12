import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PaymentForm } from '@/app/(protected)/dashboard/finanzas/payments/components/payment-form';
import { toast } from 'sonner';

const mockRpc = jest.fn();
const mockData = { financialRecords: [], financialCategories: [] as Array<Record<string, unknown>>, clients: [], partners: [], credits: [] as Array<Record<string, unknown>>, creditPaymentSchedules: [], selectedCompanyId: 'qa', refreshData: jest.fn() };
jest.mock('@/contexts/data-provider', () => ({ useData: () => mockData, calculatePartnerBalance: () => 0 }));
jest.mock('@/contexts/auth-provider', () => ({ useAuth: () => ({ currentUser: { uid: 'qa-user', companyId: 'qa' } }) }));
jest.mock('@/app/(protected)/dashboard/finanzas/payments/history/components/payment-history-view', () => ({ PaymentHistoryView: () => null }));
jest.mock('sonner', () => ({ toast: { error: jest.fn(), success: jest.fn() } }));
jest.mock('@/lib/supabase', () => ({ supabase: { rpc: (...args: unknown[]) => mockRpc(...args), from: () => {
  const query = { select: () => query, eq: () => query, order: async () => ({ data: [], error: null }) };
  return query;
} } }));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: { children: React.ReactNode; value: string; onValueChange: (value: string) => void }) =>
    <select value={value} onChange={event => onValueChange(event.target.value)}>{children}</select>,
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => children,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => <option value={value}>{children}</option>,
}));

beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(new Date('2026-11-07T05:00:00Z')); jest.clearAllMocks(); });
afterEach(() => {
  jest.useRealTimers();
  mockData.credits = [];
  mockData.financialCategories = [];
  mockRpc.mockReset();
});

it('inicia y limita la fecha al día de Monterrey aunque UTC ya sea mañana', () => {
  render(<PaymentForm embedded />);
  const date = screen.getByTitle('Formato día/mes/año');
  expect(date).toHaveValue('2026-11-06');
  expect(date).toHaveAttribute('max', '2026-11-06');
});

it('rechaza una fecha futura antes de intentar registrar el pago', () => {
  render(<PaymentForm embedded />);
  fireEvent.change(screen.getByTitle('Formato día/mes/año'), { target: { value: '2026-11-07' } });
  fireEvent.click(screen.getByRole('button', { name: 'Registrar pago' }));
  expect(toast.error).toHaveBeenCalledWith('La fecha no puede ser futura.');
});

it('reutiliza la clave después de perder la respuesta de un pago que liquida el crédito', async () => {
  const credit = { id: 'credit', clientId: 'client', companyId: 'qa', status: 'active', startDate: '2026-11-05', remainingBalance: 4 };
  mockData.credits = [credit];
  mockData.financialCategories = [{ type: 'payment', name: 'Pago de Crédito' }];
  mockRpc.mockResolvedValueOnce({ error: { message: 'Sin respuesta' } })
    .mockResolvedValueOnce({ data: { success: true, paymentId: 'payment', idempotentReplay: true } });

  const { rerender } = render(<PaymentForm embedded />);
  fireEvent.change(screen.getByRole('option', { name: 'Pago de Crédito' }).closest('select')!, { target: { value: 'credit_payment' } });
  fireEvent.change(screen.getByRole('option', { name: /Saldo/ }).closest('select')!, { target: { value: 'credit' } });
  fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '4' } });
  fireEvent.click(screen.getByRole('button', { name: 'Registrar pago' }));
  await waitFor(() => expect(toast.error).toHaveBeenCalled());

  mockData.credits = [{ ...credit, status: 'completed', remainingBalance: 0 }];
  rerender(<PaymentForm embedded />);
  fireEvent.click(screen.getByRole('button', { name: 'Registrar pago' }));
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Pago registrado'));
  expect(mockRpc).toHaveBeenCalledTimes(2);
  expect(mockRpc.mock.calls[0][0]).toBe('process_credit_payment_once');
  expect(mockRpc.mock.calls[0][1]).toMatchObject({ p_request_id: expect.any(String), p_amount: 4 });
  expect(mockRpc.mock.calls[1]).toEqual(mockRpc.mock.calls[0]);
});
