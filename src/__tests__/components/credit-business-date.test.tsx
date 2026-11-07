import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { CreditForm, creditSchema } from '@/app/(protected)/dashboard/credits/components/credit-form';

const mockData = {
  clients: [{ id: 'client', status: 'active', companyId: 'qa', createdAt: '2026-01-01' }],
  vehicles: [{ id: 'vehicle', clientId: 'client' }], credits: [], selectedCompanyId: 'qa',
};
jest.mock('@/hooks/use-data', () => ({ useData: () => mockData }));
jest.mock('@/contexts/auth-provider', () => ({ useAuth: () => ({ currentUser: { companyId: 'qa', role: 'admin' } }) }));
const base = { clientId: 'client', vehicleId: 'vehicle', numberOfPayments: 2, weeklyPayment: 5 };
beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(new Date('2026-11-07T05:00:00Z')); });
afterEach(() => jest.useRealTimers());

it('usa el día de Monterrey como valor inicial y límite', async () => {
  const { container } = render(<CreditForm onSubmit={jest.fn()} onClose={jest.fn()} isSubmitting={false} />);
  await act(async () => {});
  expect(container.querySelector('input[type="date"]')).toHaveValue('2026-11-06');
  expect(container.querySelector('input[type="date"]')).toHaveAttribute('max', '2026-11-06');
});
it('rechaza fechas imposibles y futuras en el esquema antes de enviar', () => {
  expect(creditSchema.safeParse({ ...base, startDate: '2026-11-07' }).success).toBe(false);
  expect(creditSchema.safeParse({ ...base, startDate: '2026-02-30' }).success).toBe(false);
  expect(creditSchema.safeParse({ ...base, startDate: '2026-11-06' }).success).toBe(true);
});
it('conserva la fecha civil al editar y anticipa las mismas fechas que guarda la RPC', async () => {
  const { container } = render(<CreditForm onSubmit={jest.fn()} onClose={jest.fn()} isSubmitting={false}
    initialData={{ ...base, startDate: '2026-11-06' }} />);
  await act(async () => {});
  expect(container.querySelector('input[type="date"]')).toHaveValue('2026-11-06');
  expect(screen.getAllByText('06 nov 2026').length).toBeGreaterThan(0);
  expect(screen.getByText('13 nov 2026')).toBeInTheDocument();
});

it('envía la fecha y el importe mostrados sin adelantar el inicio a lunes', async () => {
  const submit = jest.fn();
  render(<CreditForm onSubmit={submit} onClose={jest.fn()} isSubmitting={false} initialData={{ ...base, startDate: '2026-11-06' }} />);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Crear crédito' })); });
  expect(submit).toHaveBeenCalledWith(expect.objectContaining({ ...base, startDate: '2026-11-06' }));
});
