import { middleware } from '../../middleware';

// Mocks
const mockVerifySessionCookie = jest.fn();

jest.mock('next/server', () => {
  const redirect = jest.fn((url: URL) => ({ type: 'redirect', url, cookies: { delete: jest.fn() } }));
  const next = jest.fn(() => ({ type: 'next', cookies: { delete: jest.fn() } }));
  return {
    NextResponse: { redirect, next },
    NextRequest: class {},
  };
});

jest.mock('@/lib/server/firebase-admin', () => ({
  admin: {
    auth: () => ({
      verifySessionCookie: mockVerifySessionCookie,
    }),
  },
}));

const { NextResponse } = jest.requireMock('next/server');

const buildRequest = (pathname: string, session?: string) => ({
  nextUrl: { pathname, origin: 'http://localhost', searchParams: new URLSearchParams() },
  url: `http://localhost${pathname}`,
  cookies: {
    get: (name: string) => name === 'session' && session ? { value: session } : undefined,
  },
});

describe('middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_BYPASS_SESSION_COOKIE = 'false';
  });

  it('permite paso cuando NEXT_PUBLIC_BYPASS_SESSION_COOKIE=true', async () => {
    process.env.NEXT_PUBLIC_BYPASS_SESSION_COOKIE = 'true';
    const req = buildRequest('/dashboard');
    const res = await middleware(req as any);
    expect(res.type).toBe('next');
  });

  it('redirige a login cuando no hay session cookie en ruta protegida', async () => {
    const req = buildRequest('/dashboard');
    const res = await middleware(req as any);
    expect(res.type).toBe('redirect');
    expect((res as any).url.pathname).toBe('/login');
  });

  it('redirige a dashboard cuando ruta pública y ya hay sesión', async () => {
    mockVerifySessionCookie.mockResolvedValue({ role: 'admin' });
    const req = buildRequest('/login', 'token');
    const res = await middleware(req as any);
    expect(res.type).toBe('redirect');
    expect((res as any).url.pathname).toBe('/dashboard');
  });

  it('bloquea acceso a dashboard si rol no es permitido', async () => {
    mockVerifySessionCookie.mockResolvedValue({ role: 'client' });
    const req = buildRequest('/dashboard', 'token');
    const res = await middleware(req as any);
    expect(res.type).toBe('redirect');
    expect((res as any).url.pathname).toBe('/login');
  });

  it('permite acceso a dashboard con rol admin', async () => {
    mockVerifySessionCookie.mockResolvedValue({ role: 'admin' });
    const req = buildRequest('/dashboard', 'token');
    const res = await middleware(req as any);
    expect(res.type).toBe('next');
  });
});
