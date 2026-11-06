import React from 'react';
import { render } from '@testing-library/react';
import { DataProvider } from '@/contexts/data-provider-supabase';

let mockFinancialQuery: () => Promise<any[]>;
const mockRow = {
  id: 'payment-qa', company_id: 'company-qa', type: 'payment', amount: 4,
  date: '2026-11-06', reference_code: 'QA-PAYUI-1106-P1',
  source_record_id: 'fine-qa', source_record_type: 'multa',
  related_record_id: 'charge-qa', related_record_type: 'financial_record',
  is_deleted: false,
};
const mockFilters: Array<[string, unknown]> = [];

jest.mock('@/contexts/auth-provider-supabase', () => ({
  useAuth: () => ({ currentUser: { uid: 'user-qa', companyId: 'company-qa', role: 'admin' }, loading: false }),
}));
jest.mock('next/navigation', () => ({ usePathname: () => '/dashboard/finanzas/payments' }));
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
  useMutation: () => ({ mutateAsync: jest.fn() }),
  useQuery: (options: any) => {
    if (options.queryKey[0] === 'financial_records') mockFinancialQuery = options.queryFn;
    return { data: [], isLoading: false };
  },
}));
jest.mock('@/hooks/use-vehicle-analytics', () => ({ useVehicleAnalytics: () => ({ vehicleMetrics: [] }) }));
jest.mock('@/hooks/use-client-analytics', () => ({ useClientAnalytics: () => ({ clientMetrics: [] }) }));
jest.mock('@/lib/supabase-browser', () => ({ supabase: {} }));
jest.mock('@/lib/storage/resolve-private-storage-url', () => ({ resolvePrivateStorageUrls: async () => [] }));
jest.mock('@/lib/supabase', () => ({ supabase: {
  from: () => {
    let projection = '';
    const query = {
      select: (columns: string) => { projection = columns; return query; },
      eq: (field: string, value: unknown) => { mockFilters.push([field, value]); return query; },
      order: () => query,
      range: async () => ({ data: [Object.fromEntries(projection.split(',').filter(key => key in mockRow).map(key => [key, mockRow[key as keyof typeof mockRow]]))], error: null }),
    };
    return query;
  },
} }));

it('carga referencia y trazabilidad persistidas con filtros de empresa y borrado', async () => {
  render(<DataProvider><span>QA</span></DataProvider>);
  const records = await mockFinancialQuery();
  expect(records[0]).toMatchObject({
    referenceCode: 'QA-PAYUI-1106-P1', sourceRecordId: 'fine-qa', sourceRecordType: 'multa',
    relatedRecordId: 'charge-qa', relatedRecordType: 'financial_record',
  });
  expect(mockFilters).toEqual(expect.arrayContaining([['company_id', 'company-qa'], ['is_deleted', false]]));
});
