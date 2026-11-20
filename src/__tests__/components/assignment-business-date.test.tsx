import React from 'react';
import { render, screen } from '@testing-library/react';
import { AssignmentForm } from '@/app/(protected)/dashboard/vehicles/assignments/components/assignment-form';

jest.mock('@/hooks/use-data', () => ({ useData: () => ({ clients: [], rawVehicles: [], vehicleAssignmentLogs: [], credits: [] }) }));
jest.mock('@/contexts/auth-provider', () => ({ useAuth: () => ({ currentUser: { companyId: 'qa' } }) }));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));

afterEach(() => jest.useRealTimers());

it.each([
  ['2026-11-20T05:59:59Z', '2026-11-19'],
  ['2026-11-20T06:00:00Z', '2026-11-20'],
])('inicia y limita la asignación al día de Monterrey en %s', (instant, day) => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(instant));
  render(<AssignmentForm onSuccess={jest.fn()} onCancel={jest.fn()} />);
  expect(screen.getByLabelText('Fecha de asignación')).toHaveValue(day);
  expect(screen.getByLabelText('Fecha de asignación')).toHaveAttribute('max', day);
});
