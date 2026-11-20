import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { PaymentHistoryView } from '@/app/(protected)/dashboard/finanzas/payments/history/components/payment-history-view';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

let mockRole = 'admin';
let mockShowSettledCredit = false;
const mockRefreshData = jest.fn();

jest.mock('@/contexts/data-provider', () => ({ useData: () => ({
  financialRecords: [
    ...(mockShowSettledCredit ? [{
      id: 'qa-settlement', companyId: 'qa', type: 'payment', amount: 10,
      date: '2026-11-06', creditId: 'qa-credit', creditPayment: true, referenceCode: 'QA-SETTLEMENT',
    }, {
      id: 'qa-earlier', companyId: 'qa', type: 'payment', amount: 10,
      date: '2026-11-07', creditId: 'qa-credit', creditPayment: true, referenceCode: 'QA-EARLIER',
    }] : []),
    { id: 'qa-payment', companyId: 'qa', type: 'payment', amount: 4, date: '2026-11-06', clientId: 'qa-client', referenceCode: 'QA-REF' },
    { id: 'qa-fine-payment', companyId: 'qa', type: 'payment', category: 'Pago de Multa', amount: 3, date: '2026-11-05', clientId: 'qa-client', referenceCode: 'QA-FINE' },
    { id: 'qa-fine', companyId: 'qa', type: 'income', category: 'Multa', amount: 12, date: '2026-11-04', clientId: 'qa-client', sourceRecordType: 'multa' },
    { id: 'qa-refund', companyId: 'qa', type: 'expense', category: 'Devolución de Depósito', amount: 1, date: '2026-11-06', clientId: 'qa-client', referenceCode: 'QA-REFUND' },
    { id: 'qa-expense', companyId: 'qa', type: 'expense', category: 'Mantenimiento', amount: 1, date: '2026-11-06', referenceCode: 'QA-OTHER-EXPENSE' },
  ],
  clients: [{ id: 'qa-client', firstname: 'QA', lastname: 'Cliente' }], partners: [], credits: mockShowSettledCredit ? [{ id: 'qa-credit', status: 'completed', referenceCode: 'QA-CREDIT' }] : [],
  loadingData: false, selectedCompanyId: 'qa', refreshData: mockRefreshData,
}) }));
jest.mock('@/contexts/auth-provider', () => ({ useAuth: () => ({ currentUser: { companyId: 'qa', role: mockRole } }) }));
jest.mock('@/contexts/dashboard-date-context', () => ({ useDashboardDate: () => ({ dateRange: undefined }) }));
jest.mock('@/components/common/module-date-filter-bar', () => ({ ModuleDateFilterBar: () => null }));
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: async () => ({
      data: [{ source_financial_record_id: 'qa-fine-payment', target_financial_record_id: 'qa-fine', relationship_type: 'multa_payment_to_financial_record', amount_applied: 3 }],
      error: null,
    }) }) }),
    rpc: jest.fn().mockImplementation((name: string) => Promise.resolve(name === 'get_credit_settlement_payments'
      ? { data: [{ credit_id: 'qa-credit', payment_id: 'qa-settlement' }], error: null }
      : { error: null })),
  },
}));

it('muestra el día civil guardado, también en una zona al oeste de UTC', async () => {
  render(<PaymentHistoryView embedded />);
  expect(await screen.findByText('QA-REF')).toBeInTheDocument();
  expect(screen.getAllByText('06/11/2026').length).toBeGreaterThan(0);
  expect(screen.queryByText('5/11/2026')).not.toBeInTheDocument();
});

it('nombra las acciones y conserva la referencia al abrir la edición', async () => {
  render(<PaymentHistoryView embedded />);
  const editButtons = await screen.findAllByRole('button', { name: 'Editar pago' });
  expect(screen.getAllByRole('button', { name: 'Eliminar pago' }).length).toBeGreaterThan(0);
  fireEvent.click(editButtons[0]);
  expect(screen.getByDisplayValue('QA-REF')).toBeInTheDocument();
});

it('incluye devoluciones de garantía registradas como gasto y excluye otros gastos', async () => {
  render(<PaymentHistoryView embedded />);
  expect(await screen.findByText('QA-REFUND')).toBeInTheDocument();
  expect(screen.getAllByText('Devolución de Depósito').length).toBeGreaterThan(0);
  expect(screen.queryByText('QA-OTHER-EXPENSE')).not.toBeInTheDocument();
});

it('rechaza mañana de Monterrey al editar, aunque ya sea ese día en UTC', () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-11-07T05:00:00Z'));
  const error = jest.spyOn(toast, 'error');
  try {
    render(<PaymentHistoryView embedded />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Editar pago' })[0]);
    const date = screen.getByDisplayValue('2026-11-06');
    fireEvent.change(date, { target: { value: '2026-11-07' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(error).toHaveBeenCalledWith('La fecha no puede ser futura.');
    expect(date).toHaveAttribute('max', '2026-11-06');
  } finally { error.mockRestore(); jest.useRealTimers(); }
});


it('guarda la edición de un pago de multa contra su cargo original', async () => {
  render(<PaymentHistoryView embedded />);
  const row = (await screen.findAllByText('QA-FINE')).map(label => label.closest('tr')).find(Boolean);
  expect(row).toBeTruthy();
  expect(within(row!).getByText('Pago de Multa')).toBeInTheDocument();
  expect(within(row!).queryByText('Pago de Cliente')).not.toBeInTheDocument();
  fireEvent.click(within(row!).getByRole('button', { name: 'Editar pago' }));
  expect(screen.getByText('Editar Pago de Multa')).toBeInTheDocument();
  fireEvent.change(screen.getByDisplayValue('3'), { target: { value: '12' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
  await waitFor(() => expect(supabase.rpc).toHaveBeenCalledWith('update_financial_payment_atomic', expect.objectContaining({
    p_payment_id: 'qa-fine-payment',
    p_amount: 12,
    p_target_financial_record_id: 'qa-fine',
  })));
});


it('revierte un pago de multa desde el historial tras confirmar', async () => {
  const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
  try {
    render(<PaymentHistoryView embedded />);
    const row = (await screen.findAllByText('QA-FINE')).map(label => label.closest('tr')).find(Boolean);
    expect(row).toBeTruthy();
    fireEvent.click(within(row!).getByRole('button', { name: 'Eliminar pago' }));
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalledWith('delete_financial_payment_atomic', {
      p_payment_id: 'qa-fine-payment',
    }));
  } finally {
    confirm.mockRestore();
  }
});


describe('reactivación de créditos desde Pagos', () => {
  beforeEach(() => {
    mockShowSettledCredit = true;
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockRole = 'admin';
    mockShowSettledCredit = false;
    jest.restoreAllMocks();
  });

  it('envía el pago seleccionado a la operación de reactivación y actualiza el historial', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    render(<PaymentHistoryView embedded />);
    const row = await screen.findByRole('row', { name: /QA-SETTLEMENT/ });
    fireEvent.click(await within(row).findByRole('button', { name: 'Reactivar crédito' }));
    await waitFor(() => expect(mockRefreshData).toHaveBeenCalledTimes(1));
    expect(supabase.rpc).toHaveBeenCalledWith('reopen_settled_credit', { p_payment_id: 'qa-settlement' });
  });

  it('sólo ofrece reactivación en el pago registrado por BD, aunque otro abono tenga fecha posterior', async () => {
    render(<PaymentHistoryView embedded />);
    const settlement = await screen.findByRole('row', { name: /QA-SETTLEMENT/ });
    expect(await within(settlement).findByRole('button', { name: 'Reactivar crédito' })).toBeEnabled();
    const earlier = screen.getByRole('row', { name: /QA-EARLIER/ });
    expect(within(earlier).queryByRole('button', { name: 'Reactivar crédito' })).not.toBeInTheDocument();
    const protectedButton = within(earlier).getByRole('button', { name: 'Pago de crédito liquidado protegido' });
    expect(protectedButton).toBeDisabled();
    fireEvent.click(protectedButton);
    expect(supabase.rpc).not.toHaveBeenCalledWith('reopen_settled_credit', expect.anything());
    expect(supabase.rpc).toHaveBeenCalledWith('get_credit_settlement_payments', { p_company_id: 'qa' });
  });

  it('no habilita reactivaciones si falla la lectura de liquidaciones', async () => {
    const error = jest.spyOn(toast, 'error');
    (supabase.rpc as jest.Mock).mockResolvedValueOnce({ data: null, error: { message: 'Unavailable' } });
    render(<PaymentHistoryView embedded />);
    await waitFor(() => expect(error).toHaveBeenCalledWith('No se pudo verificar el pago de liquidación', expect.anything()));
    expect(screen.queryByRole('button', { name: 'Reactivar crédito' })).not.toBeInTheDocument();
    for (const button of screen.getAllByRole('button', { name: 'Pago de crédito liquidado protegido' })) expect(button).toBeDisabled();
  });

  it('conserva protegidos los créditos históricos sin contexto de liquidación', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValueOnce({ data: [], error: null });
    render(<PaymentHistoryView embedded />);
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalledWith('get_credit_settlement_payments', { p_company_id: 'qa' }));
    expect(screen.queryByRole('button', { name: 'Reactivar crédito' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('row', { name: /QA-SETTLEMENT/ })).getByRole('button', { name: 'Pago de crédito liquidado protegido' })).toBeDisabled();
  });

  it('deshabilita la reactivación para un editor', async () => {
    mockRole = 'editor';
    render(<PaymentHistoryView embedded />);
    const row = await screen.findByRole('row', { name: /QA-SETTLEMENT/ });
    expect(await within(row).findByRole('button', { name: 'Reactivar crédito' })).toBeDisabled();
  });
});
