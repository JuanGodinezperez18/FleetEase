import React from 'react';
import { render, screen } from '@testing-library/react';
import { VehicleForm } from '@/app/(protected)/dashboard/vehicles/components/vehicle-form';
import { toSbVehicle, toSbVehicleUpdate } from '@/lib/domain-mappers';

jest.mock('@/hooks/use-data', () => ({ useData: () => ({ clients: [], partners: [], credits: [], rawVehicles: [] }) }));
jest.mock('@/contexts/auth-provider', () => ({ useAuth: () => ({ currentUser: { companyId: 'qa' } }) }));
jest.mock('@/components/vehicles/circulation-card-scanner', () => ({ CirculationCardScanner: () => null }));
const mockFileInput = jest.fn((_props: { folder: string; entityId: string; id: string }) => null);
jest.mock('@/components/common/multiple-file-input', () => ({ MultipleFileInput: (props: { folder: string; entityId: string; id: string }) => mockFileInput(props) }));

const props = { onSuccess: jest.fn(), onSubmit: jest.fn(), onOpenPartnerModal: jest.fn(), onClose: jest.fn(), isSubmitting: false };

afterEach(() => jest.useRealTimers());

it('identifica ambos documentos como archivos del vehículo al subirlos desde edición', () => {
  mockFileInput.mockClear();
  render(<VehicleForm {...props} initialData={{ id: 'qa-vehicle' }} />);
  const uploads = [...new Map(mockFileInput.mock.calls.map(([upload]) => [upload.id, upload])).values()];
  expect(uploads.filter(upload => upload.folder === 'driver_documents')).toHaveLength(0);
  expect(uploads.filter(upload => upload.folder === 'vehicle_documents')).toEqual([
    expect.objectContaining({ entityId: 'qa-vehicle' }),
    expect.objectContaining({ entityId: 'qa-vehicle' }),
  ]);
});

it('conserva la fecha registrada a medianoche UTC al abrir la edición en México', () => {
  render(<VehicleForm {...props} initialData={{ id: 'qa', createdAt: '2026-11-19T00:00:00+00:00' }} />);
  expect(screen.getByLabelText('Fecha de Creación')).toHaveValue('2026-11-19');
  expect(screen.getByLabelText('Fecha de Creación')).toBeDisabled();
});

it('usa hoy de Monterrey tanto para el valor inicial como para el límite del alta', () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-11-20T05:59:59Z'));
  render(<VehicleForm {...props} />);
  expect(screen.getByLabelText('Fecha de Creación')).toHaveValue('2026-11-19');
  expect(screen.getByLabelText('Fecha de Creación')).toHaveAttribute('max', '2026-11-19');
});

it('una edición nunca vuelve a escribir created_at aunque reciba el día anterior del formulario', () => {
  expect(toSbVehicleUpdate({ createdAt: '2026-11-18', plate: 'QA-20-UI' })).toEqual({ plate: 'QA-20-UI' });
  expect(toSbVehicle({ createdAt: '2026-11-19', plate: 'QA-19-UI' })).toEqual({ created_at: '2026-11-19', plate: 'QA-19-UI' });
});
