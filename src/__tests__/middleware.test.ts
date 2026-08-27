import { middleware } from '../../middleware';

const mockGetSession = jest.fn();
const mockGetProfile = jest.fn();

jest.mock('next/server', () => {
  const redirect = jest.fn((url: URL) => ({ type: 'redirect', url, cookies: { delete: jest.fn() } }));
  const next = jest.fn(() => ({ type: 'next', cookies: { delete: jest.fn() } }));
  return {
    NextResponse: { redirect, next },
    NextRequest: class {},
  };
});

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    auth: { getSession: mockGetSession },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve(mockGetProfile())),
          })),
        })),
      })),
    })),
  })),
}));

const buildRequest = (pathname: string, hasSession = false) => ({
  nextUrl: { pathname, origin: 'http://localhost', searchParams: new URLSearchParams() },
  url: `http://localhost${pathname}`,
  cookies: {
    get: (name: string) => (name === 'sb-access-token' && hasSession ? { value: 'token' } : undefined),
  },
});

const session = { user: { id: 'u1' } };

describe('middleware (Supabase SSR)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockReset();
    mockGetProfile.mockReset();
  });

  it('permite paso a rutas API y estáticas', async () => {
    const res = await middleware(buildRequest('/api/stripe/webhook') as any);
    expect(res.type).toBe('next');
  });

  it('trata "/" como ruta pública', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    const res = await middleware(buildRequest('/') as any);
    expect(res.type).toBe('next');
  });

  it('regresión: /dashboard NO debe tratarse como pública', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    const res = await middleware(buildRequest('/dashboard') as any);
    expect(res.type).toBe('redirect');
    expect((res as any).url.pathname).toBe('/login');
  });

  it('redirige a login sin sesión en /partner', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    const res = await middleware(buildRequest('/partner') as any);
    expect(res.type).toBe('redirect');
    expect((res as any).url.pathname).toBe('/login');
  });

  it('redirige de /login a /dashboard si ya hay sesión', async () => {
    mockGetSession.mockResolvedValue({ data: { session }, error: null });
    const res = await middleware(buildRequest('/login', true) as any);
    expect(res.type).toBe('redirect');
    expect((res as any).url.pathname).toBe('/dashboard');
  });

  it('bloquea acceso a /partner para rol admin', async () => {
    mockGetSession.mockResolvedValue({ data: { session }, error: null });
    mockGetProfile.mockResolvedValue({ data: { role: 'admin', company_id: 'c1' }, error: null });
    const res = await middleware(buildRequest('/partner', true) as any);
    expect(res.type).toBe('redirect');
  });

  it('bloquea acceso a /client para rol partner', async () => {
    mockGetSession.mockResolvedValue({ data: { session }, error: null });
    mockGetProfile.mockResolvedValue({ data: { role: 'partner', company_id: 'c1' }, error: null });
    const res = await middleware(buildRequest('/client', true) as any);
    expect(res.type).toBe('redirect');
  });

  it('permite acceso a /dashboard para rol admin', async () => {
    mockGetSession.mockResolvedValue({ data: { session }, error: null });
    mockGetProfile.mockResolvedValue({ data: { role: 'admin', company_id: 'c1' }, error: null });
    const res = await middleware(buildRequest('/dashboard', true) as any);
    expect(res.type).toBe('next');
  });

  it('permite acceso a /client para rol client', async () => {
    mockGetSession.mockResolvedValue({ data: { session }, error: null });
    mockGetProfile.mockResolvedValue({ data: { role: 'client', company_id: 'c1' }, error: null });
    const res = await middleware(buildRequest('/client', true) as any);
    expect(res.type).toBe('next');
  });

  it('redirige a login si el perfil del usuario no existe', async () => {
    mockGetSession.mockResolvedValue({ data: { session }, error: null });
    mockGetProfile.mockResolvedValue({ data: null, error: { message: 'not found' } });
    const res = await middleware(buildRequest('/dashboard', true) as any);
    expect(res.type).toBe('redirect');
    expect((res as any).url.pathname).toBe('/login');
  });
});
