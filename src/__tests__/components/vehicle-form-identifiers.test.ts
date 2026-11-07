import { createVehicleSchema } from '@/app/(protected)/dashboard/vehicles/components/vehicle-form';
import type { Vehicle } from '@/types';
jest.mock('@/hooks/use-data', () => ({ useData: jest.fn() }));
jest.mock('@/contexts/auth-provider', () => ({ useAuth: jest.fn() }));
jest.mock('@/components/vehicles/circulation-card-scanner', () => ({ CirculationCardScanner: () => null }));
jest.mock('@/components/common/multiple-file-input', () => ({ MultipleFileInput: () => null }));
const base = { alias: 'QA', make: 'Honda', model: 'Civic', year: 2020, plate: 'ABC1234', serialNumber: '1HGCM82633A004352', status: 'active', clientId: null, partnerId: null, currentMileage: 100, acquisitionDate: '2020-01-01', insurancePolicyNumber: 'policy', insuranceExpiryDate: '2027-01-01', color: 'Azul', companyId: 'qa' };
it('el esquema real del formulario aplica formato y duplicados canónicos', () => {
  const s = createVehicleSchema([]);
  expect(s.safeParse(base).success).toBe(true);
  expect(s.safeParse({ ...base, serialNumber: 'short' }).success).toBe(false);
  expect(s.safeParse({ ...base, plate: 'A/B' }).success).toBe(false);
  const existing = [{ id: 'other', plate: 'ABC-1234', serialNumber: 'OTHER' }] as Vehicle[];
  expect(createVehicleSchema(existing).safeParse(base).success).toBe(false);
});
it('editar otros campos conserva el VIN histórico desde el esquema real', () => {
  const old = { ...base, id: 'old', serialNumber: 'LEGACY', plate: 'ANTIGUA/1' };
  expect(createVehicleSchema([old] as Vehicle[], 'old').safeParse({ ...old, color: 'Negro' }).success).toBe(true);
});
