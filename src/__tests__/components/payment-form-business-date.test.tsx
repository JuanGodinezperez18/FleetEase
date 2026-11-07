import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { PaymentForm } from '@/app/(protected)/dashboard/finanzas/payments/components/payment-form';
import { toast } from 'sonner';

const mockData = { financialRecords: [], financialCategories: [], clients: [], partners: [], credits: [], selectedCompanyId: 'qa', refreshData: jest.fn() };
jest.mock('@/contexts/data-provider', () => ({ useData: () => mockData, calculatePartnerBalance: () => 0 }));
jest.mock('@/contexts/auth-provider', () => ({ useAuth: () => ({ currentUser: { uid: 'qa-user', companyId: 'qa' } }) }));
jest.mock('@/app/(protected)/dashboard/finanzas/payments/history/components/payment-history-view', () => ({ PaymentHistoryView: () => null }));
jest.mock('sonner', () => ({ toast: { error: jest.fn(), success: jest.fn() } }));
jest.mock('@/lib/supabase', () => ({ supabase: { from: () => {
  const query = { select: () => query, eq: () => query, order: async () => ({ data: [], error: null }) };
  return query;
} } }));

beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(new Date('2026-11-07T05:00:00Z')); jest.clearAllMocks(); });
afterEach(() => jest.useRealTimers());

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
