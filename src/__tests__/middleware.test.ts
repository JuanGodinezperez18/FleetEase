import { middleware } from '../../middleware';

const mockGetUser = jest.fn();
const mockGetProfile = jest.fn();

jest.mock('next/server', () => {
  const makeResponse = (type: string, url?: URL) => ({
    type,
    ...(url ? { url } : {}),
    headers: new Headers(),
    cookies: { set: jest.fn(), delete: jest.fn() },
  });

  return {
    NextResponse: {
      redirect: jest.fn((url: URL) => makeResponse('redirect', url)),
      next: jest.fn(() => makeResponse('next')),
    },
    NextRequest: class {},
  };
});

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    auth: { getUser: mockGetUser },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: mockGetProfile,
          })),
        })),
      })),
    })),
  })),
}));

type MockMiddlewareResponse = { type: string; url?: URL; headers: Headers };
const asMockResponse = (response: unknown): MockMiddlewareResponse => response as MockMiddlewareResponse;

const buildRequest = (pathname: string) => ({
  nextUrl: { pathname, origin: 'http://localhost', searchParams: new URLSearchParams() },
  url: `http://localhost${pathname}`,
  headers: new Headers(),
  cookies: {
    get: jest.fn(),
    getAll: jest.fn(() => []),
    set: jest.fn(),
  },
});

const setAuthenticatedRole = (role: string) => {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
  mockGetProfile.mockResolvedValue({ data: { role, is_deleted: false }, error: null });
};

describe('middleware (Supabase SSR and role authorization)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockReset();
    mockGetProfile.mockReset();
  });

  it('applies security headers to API/static pass-through responses', async () => {
    const res = asMockResponse(await middleware(buildRequest('/api/stripe/webhook') as unknown as Parameters<typeof middleware>[0]));
    expect(res.type).toBe('next');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('content-security-policy')).toContain("default-src 'self'");
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('treats the home page and login as public', async () => {
    for (const pathname of ['/', '/login']) {
      const res = asMockResponse(await middleware(buildRequest(pathname) as unknown as Parameters<typeof middleware>[0]));
      expect(res.type).toBe('next');
    }
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('redirects unauthenticated users to login on protected routes', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = asMockResponse(await middleware(buildRequest('/dashboard') as unknown as Parameters<typeof middleware>[0]));
    expect(res.type).toBe('redirect');
    expect(res.url?.pathname).toBe('/login');
    expect(res.url?.searchParams.get('callbackUrl')).toBe('/dashboard');
    expect(res.headers.get('x-frame-options')).toBe('SAMEORIGIN');
    expect(mockGetProfile).not.toHaveBeenCalled();
  });

  it('does not bypass authorization for dotted paths inside protected routes', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = asMockResponse(await middleware(buildRequest('/dashboard/reports/export.csv') as unknown as Parameters<typeof middleware>[0]));
    expect(res.type).toBe('redirect');
    expect(res.url?.pathname).toBe('/login');
    expect(res.url?.searchParams.get('callbackUrl')).toBe('/dashboard/reports/export.csv');
  });

  it('allows an admin role into dashboard routes', async () => {
    setAuthenticatedRole('admin');
    const res = asMockResponse(await middleware(buildRequest('/dashboard/vehicles') as unknown as Parameters<typeof middleware>[0]));
    expect(res.type).toBe('next');
    expect(mockGetProfile).toHaveBeenCalledTimes(1);
  });

  it('blocks an admin from partner routes and redirects to dashboard', async () => {
    setAuthenticatedRole('admin');
    const res = asMockResponse(await middleware(buildRequest('/partner/vehicles') as unknown as Parameters<typeof middleware>[0]));
    expect(res.type).toBe('redirect');
    expect(res.url?.pathname).toBe('/dashboard');
  });

  it('allows partner role into partner routes', async () => {
    setAuthenticatedRole('partner');
    const res = asMockResponse(await middleware(buildRequest('/partner/vehicles') as unknown as Parameters<typeof middleware>[0]));
    expect(res.type).toBe('next');
  });

  it('blocks partner role from client and dashboard routes', async () => {
    setAuthenticatedRole('partner');
    const clientRes = asMockResponse(await middleware(buildRequest('/client/payments') as unknown as Parameters<typeof middleware>[0]));
    expect(clientRes.type).toBe('redirect');
    expect(clientRes.url?.pathname).toBe('/partner');

    const dashboardRes = asMockResponse(await middleware(buildRequest('/dashboard') as unknown as Parameters<typeof middleware>[0]));
    expect(dashboardRes.type).toBe('redirect');
    expect(dashboardRes.url?.pathname).toBe('/partner');
  });

  it('allows client role into client routes and blocks partner routes', async () => {
    setAuthenticatedRole('client');
    const allowed = asMockResponse(await middleware(buildRequest('/client/payments') as unknown as Parameters<typeof middleware>[0]));
    expect(allowed.type).toBe('next');

    const blocked = asMockResponse(await middleware(buildRequest('/partner') as unknown as Parameters<typeof middleware>[0]));
    expect(blocked.type).toBe('redirect');
    expect(blocked.url?.pathname).toBe('/client');
  });

  it('denies access when the user profile is missing or deleted', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mockGetProfile.mockResolvedValue({ data: { role: 'admin', is_deleted: true }, error: null });
    const res = asMockResponse(await middleware(buildRequest('/dashboard') as unknown as Parameters<typeof middleware>[0]));
    expect(res.type).toBe('redirect');
    expect(res.url?.pathname).toBe('/login');
  });

  it('denies access when the profile query fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mockGetProfile.mockResolvedValue({ data: null, error: { message: 'profile unavailable' } });
    const res = asMockResponse(await middleware(buildRequest('/dashboard') as unknown as Parameters<typeof middleware>[0]));
    expect(res.type).toBe('redirect');
    expect(res.url?.pathname).toBe('/login');
  });
});
