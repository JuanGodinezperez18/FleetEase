import React from 'react';
import { render, screen } from '@testing-library/react';
import { PaymentHistoryView } from '@/app/(protected)/dashboard/finanzas/payments/history/components/payment-history-view';

jest.mock('@/contexts/data-provider', () => ({ useData: () => ({
  financialRecords: [{ id: 'qa-payment', companyId: 'qa', type: 'payment', amount: 4, date: '2026-11-06', clientId: 'qa-client', referenceCode: 'QA-REF' }],
  clients: [{ id: 'qa-client', firstname: 'QA', lastname: 'Cliente' }], partners: [], credits: [],
  loadingData: false, selectedCompanyId: 'qa', refreshData: jest.fn(),
}) }));
jest.mock('@/contexts/auth-provider', () => ({ useAuth: () => ({ currentUser: { companyId: 'qa', role: 'admin' } }) }));
jest.mock('@/contexts/dashboard-date-context', () => ({ useDashboardDate: () => ({ dateRange: undefined }) }));
jest.mock('@/components/common/module-date-filter-bar', () => ({ ModuleDateFilterBar: () => null }));
jest.mock('@/lib/supabase', () => ({ supabase: { from: () => ({ select: () => ({ eq: async () => ({ data: [], error: null }) }) }) } }));

it('muestra el día civil guardado, también en una zona al oeste de UTC', async () => {
  render(<PaymentHistoryView embedded />);
  expect(await screen.findByText('QA-REF')).toBeInTheDocument();
  expect(screen.getAllByText('06/11/2026').length).toBeGreaterThan(0);
  expect(screen.queryByText('5/11/2026')).not.toBeInTheDocument();
});
