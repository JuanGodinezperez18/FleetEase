import { GET } from './route';
import { supabaseAdmin } from '@/lib/admin-api-auth';
import { createServerClient } from '@supabase/ssr';
import { checkRateLimit } from '@/lib/rate-limit';

jest.mock('next/server', () => ({
  NextResponse: { json: (body: unknown, init?: ResponseInit) => ({
    status: init?.status ?? 200,
    headers: new Headers(init?.headers),
    json: async () => body,
  }) },
}));
jest.mock('next/headers', () => ({ cookies: jest.fn().mockResolvedValue({}) }));
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('@/lib/rate-limit', () => ({ checkRateLimit: jest.fn(), healthLimiter: {} }));
jest.mock('@supabase/ssr', () => ({ createServerClient: jest.fn() }));
jest.mock('@/lib/admin-api-auth', () => ({ supabaseAdmin: { from: jest.fn() } }));

const request = { headers: new Headers() } as Request;
const query = { select: jest.fn().mockReturnThis(), limit: jest.fn() };
const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const previousKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

beforeEach(() => {
  jest.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://qa.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'qa-public-key';
  jest.mocked(checkRateLimit).mockResolvedValue(null);
  jest.mocked(supabaseAdmin.from).mockReturnValue(query as never);
  query.limit.mockResolvedValue({ data: null, error: null });
  jest.mocked(createServerClient).mockReturnValue({
    from: () => ({ select: () => ({ limit: async () => ({ error: { code: '42501' } }) }) }),
    auth: { getSession: async () => ({ error: null }) },
    storage: { listBuckets: async () => ({ error: null }) },
  } as never);
});

afterEach(() => {
  if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
  if (previousKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = previousKey;
});

it('checks database availability when anonymous company reads are correctly denied', async () => {
  const response = await GET(request);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ status: 'healthy', timestamp: expect.any(String) });
  expect(query.select).toHaveBeenCalledWith('id', { head: true });
  expect(query.limit).toHaveBeenCalledWith(1);
  expect(response.headers.get('cache-control')).toContain('no-store');
});

it('reports an actual database outage without exposing details publicly', async () => {
  query.limit.mockResolvedValue({ error: new Error('private database diagnostic') });
  const response = await GET(request);
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ status: 'unhealthy', timestamp: expect.any(String) });
});

it('applies the distributed limiter before probing any service', async () => {
  jest.mocked(checkRateLimit).mockResolvedValue({ status: 429 } as Response);
  expect((await GET(request)).status).toBe(429);
  expect(supabaseAdmin.from).not.toHaveBeenCalled();
  expect(createServerClient).not.toHaveBeenCalled();
});
