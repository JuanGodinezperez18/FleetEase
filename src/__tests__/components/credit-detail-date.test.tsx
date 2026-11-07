import React from 'react';
import { render, screen } from '@testing-library/react';
import CreditDetailPage from '@/app/(protected)/dashboard/credits/[id]/page';
const mockData = {
  credits: [{ id: 'credit', clientId: 'client', vehicleId: 'vehicle', startDate: '2026-11-07', status: 'active', totalAmount: 10, paidAmount: 5, remainingBalance: 5 }],
  clients: [{ id: 'client', name: 'QA' }], vehicles: [{ id: 'vehicle', plate: 'QA123' }],
  financialRecords: [{ id: 'payment', creditId: 'credit', type: 'payment', date: '2026-11-07', amount: 5 }],
  creditPaymentSchedules: [{ id: 'schedule', creditId: 'credit', paymentNumber: 1, dueDate: '2026-11-07', paidDate: '2026-11-07', amount: 5, paidAmount: 5, status: 'paid' }],
  financialCategories: [], selectedCompanyId: 'qa',
};
jest.mock('@/hooks/use-data', () => ({ useData: () => mockData }));
jest.mock('next/navigation', () => ({ useParams: () => ({ id: 'credit' }), useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }));
jest.mock('@/components/common/data-table', () => ({
  DataTable: ({ columns, data }: any) => <div>{data.map((original: any) => <div key={original.id}>{columns.filter((c: any) => c.cell).map((c: any) => <span key={c.accessorKey}>{c.cell({ row: { original } })}</span>)}</div>)}</div>,
}));
it('mantiene el día civil en alta, vencimiento, fecha pagada e historial', () => {
  render(<CreditDetailPage />);
  expect(screen.getAllByText('07/11/2026')).toHaveLength(4);
  expect(screen.queryByText('06/11/2026')).not.toBeInTheDocument();
});
