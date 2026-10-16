import { middleware } from '../../middleware';

const mockGetUser = jest.fn();
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
    nextUrl: {
      pathname: url.pathname,
      origin: url.origin,
      searchParams: url.searchParams,
    },
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

describe('middleware authentication and security headers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockReset();
    mockCreateServerClient.mockReset();
    mockCreateServerClient.mockReturnValue({
      auth: { getUser: mockGetUser },
    });
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  it.each(['/','/login','/register','/forgot-password','/reset-password'])(
    'does not make an auth network call for public path %s',
    async (path) => {
      const response = await middleware(buildRequest(path) as any);
      expect(response.type).toBe('next');
      expect(mockCreateServerClient).not.toHaveBeenCalled();
    },
  );

  it.each(['/api/stripe/webhook','/_next/static/app.js','/images/logo.png'])(
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

  it('redirects when Supabase cannot validate the user', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Auth service unavailable' },
    });

    const response = await middleware(buildRequest('/dashboard') as any);

    expect(response.type).toBe('redirect');
    expect(response.url.pathname).toBe('/login');
  });

  it('allows a validated user to continue to a protected page', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    const response = await middleware(buildRequest('/dashboard') as any);

    expect(response.type).toBe('next');
    expect(mockGetUser).toHaveBeenCalledTimes(1);
  });

  it('applies the security headers to protected-page responses', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

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

  it('does not claim to enforce application roles in middleware', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    // Role authorization must be enforced by the relevant page/API and RLS.
    // This test deliberately verifies authentication only, not role policy.
    const response = await middleware(buildRequest('/partner') as any);
    expect(response.type).toBe('next');
  });
});
