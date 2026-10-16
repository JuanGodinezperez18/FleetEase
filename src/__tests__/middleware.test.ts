import { middleware } from '../../middleware';

const mockGetUser = jest.fn();
const mockGetProfile = jest.fn();
const mockCreateServerClient = jest.fn();

jest.mock('next/server', () => {
  const makeResponse = (type: string, url?: URL) => ({
    type,
    url,
    headers: { set: jest.fn() },
    cookies: { set: jest.fn() },
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
  createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}));

jest.mock('@/lib/security/cookies', () => ({
  hardenAuthCookieOptions: (options: unknown) => options,
}));

function buildRequest(pathname: string) {
  const url = new URL(pathname, 'https://fleetease.test');
  const cookieValues: Array<{ name: string; value: string }> = [];

  return {
    nextUrl: { pathname: url.pathname, origin: url.origin, searchParams: url.searchParams },
    url: url.toString(),
    headers: new Headers(),
    cookies: {
      getAll: () => cookieValues,
      set: (name: string, value: string) => {
        const existing = cookieValues.find((cookie) => cookie.name === name);
        if (existing) existing.value = value;
        else cookieValues.push({ name, value });
      },
    },
  };
}

describe('middleware authentication and role authorization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockReset();
    mockGetProfile.mockReset();
    mockCreateServerClient.mockReset();
    mockGetProfile.mockResolvedValue({
      data: { role: 'admin', is_deleted: false },
      error: null,
    });
    mockCreateServerClient.mockReturnValue({
      auth: { getUser: mockGetUser },
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({ maybeSingle: mockGetProfile })),
        })),
      })),
    });
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  it.each(['/','/login','/register','/forgot-password','/reset-password','/registro','/privacidad','/cookies','/terminos','/cancelaciones'])(
    'does not make an auth network call for public path %s',
    async (path) => {
      const response = await middleware(buildRequest(path) as any);
      expect(response.type).toBe('next');
      expect(mockCreateServerClient).not.toHaveBeenCalled();
    },
  );

  it.each(['/api/stripe/webhook','/_next/static/app.js','/images/logo.png','/manifest.json','/robots.txt'])(
    'passes through API/static path %s without an auth lookup',
    async (path) => {
      const response = await middleware(buildRequest(path) as any);
      expect(response.type).toBe('next');
      expect(mockCreateServerClient).not.toHaveBeenCalled();
    },
  );

  it('redirects unauthenticated users to login and preserves callbackUrl', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'No authenticated user' },
    });

    const response = await middleware(buildRequest('/dashboard/vehicles') as any);

    expect(response.type).toBe('redirect');
    expect(response.url.pathname).toBe('/login');
    expect(response.url.searchParams.get('callbackUrl')).toBe('/dashboard/vehicles');
    expect(mockGetUser).toHaveBeenCalledTimes(1);
  });

  it('fails closed when Supabase cannot validate the user', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Auth service unavailable' },
    });

    const response = await middleware(buildRequest('/dashboard') as any);

    expect(response.type).toBe('redirect');
    expect(response.url.pathname).toBe('/login');
  });

  it('fails closed when the active user profile is missing or deleted', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockGetProfile.mockResolvedValue({ data: null, error: null });

    const response = await middleware(buildRequest('/dashboard') as any);

    expect(response.type).toBe('redirect');
    expect(response.url.pathname).toBe('/login');
  });

  it('does not bypass role checks for protected paths containing a dot', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockGetProfile.mockResolvedValue({ data: { role: 'admin', is_deleted: false }, error: null });

    const response = await middleware(buildRequest('/partner/vehicle.v1') as any);

    expect(response.type).toBe('redirect');
    expect(response.url.pathname).toBe('/dashboard');
    expect(mockGetUser).toHaveBeenCalledTimes(1);
  });

  it('allows a staff role to continue to dashboard', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    const response = await middleware(buildRequest('/dashboard') as any);

    expect(response.type).toBe('next');
    expect(mockGetProfile).toHaveBeenCalledTimes(1);
  });

  it.each(['admin','editor','viewer','super_admin'])(
    'redirects staff role %s away from the partner portal',
    async (role) => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
      mockGetProfile.mockResolvedValue({ data: { role, is_deleted: false }, error: null });

      const response = await middleware(buildRequest('/partner/vehicles') as any);

      expect(response.type).toBe('redirect');
      expect(response.url.pathname).toBe('/dashboard');
    },
  );

  it('allows a partner into the partner portal and redirects them away from dashboard', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockGetProfile.mockResolvedValue({ data: { role: 'partner', is_deleted: false }, error: null });

    const partnerResponse = await middleware(buildRequest('/partner') as any);
    expect(partnerResponse.type).toBe('next');

    const dashboardResponse = await middleware(buildRequest('/dashboard') as any);
    expect(dashboardResponse.type).toBe('redirect');
    expect(dashboardResponse.url.pathname).toBe('/partner');
  });

  it('allows a client into the client portal and redirects them away from dashboard', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockGetProfile.mockResolvedValue({ data: { role: 'client', is_deleted: false }, error: null });

    const clientResponse = await middleware(buildRequest('/client/payments') as any);
    expect(clientResponse.type).toBe('next');

    const dashboardResponse = await middleware(buildRequest('/dashboard') as any);
    expect(dashboardResponse.type).toBe('redirect');
    expect(dashboardResponse.url.pathname).toBe('/client');
  });

  it('allows an authenticated partner to reach MCP OAuth consent', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockGetProfile.mockResolvedValue({ data: { role: 'partner', is_deleted: false }, error: null });

    const response = await middleware(buildRequest('/oauth/consent') as any);

    expect(response.type).toBe('next');
  });

  it('allows an authenticated client to reach MCP OAuth consent', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockGetProfile.mockResolvedValue({ data: { role: 'client', is_deleted: false }, error: null });

    const response = await middleware(buildRequest('/oauth/consent') as any);

    expect(response.type).toBe('next');
  });

  it('confines partner accounts to their portal instead of other protected routes', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockGetProfile.mockResolvedValue({ data: { role: 'partner', is_deleted: false }, error: null });

    const response = await middleware(buildRequest('/settings') as any);

    expect(response.type).toBe('redirect');
    expect(response.url.pathname).toBe('/partner');
  });

  it('redirects a client away from the partner portal', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockGetProfile.mockResolvedValue({ data: { role: 'client', is_deleted: false }, error: null });

    const response = await middleware(buildRequest('/partner') as any);

    expect(response.type).toBe('redirect');
    expect(response.url.pathname).toBe('/client');
  });

  it('applies the security headers to protected-page responses', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    const response = await middleware(buildRequest('/dashboard') as any);

    expect(response.headers.set).toHaveBeenCalledWith(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload',
    );
    expect(response.headers.set).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    expect(response.headers.set).toHaveBeenCalledWith('X-Frame-Options', 'SAMEORIGIN');
    expect(response.headers.set).toHaveBeenCalledWith(
      'Content-Security-Policy',
      expect.stringContaining("default-src 'self'"),
    );
  });
});
