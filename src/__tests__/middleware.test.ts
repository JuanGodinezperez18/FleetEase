import { middleware } from '../../middleware';

const mockGetUser = jest.fn();

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
  })),
}));

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

describe('middleware (Supabase SSR)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockReset();
  });

  it('permite paso a rutas API y estáticas y aplica encabezados de seguridad', async () => {
    const res = await middleware(buildRequest('/api/stripe/webhook') as any);
    expect(res.type).toBe('next');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('content-security-policy')).toContain("default-src 'self'");
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('trata "/" como ruta pública sin consultar Supabase', async () => {
    const res = await middleware(buildRequest('/') as any);
    expect(res.type).toBe('next');
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('mantiene /login como ruta pública', async () => {
    const res = await middleware(buildRequest('/login') as any);
    expect(res.type).toBe('next');
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('redirige a login cuando una ruta protegida no tiene sesión', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await middleware(buildRequest('/dashboard') as any);
    expect(res.type).toBe('redirect');
    expect((res as any).url.pathname).toBe('/login');
    expect(res.headers.get('x-frame-options')).toBe('SAMEORIGIN');
  });

  it('permite una ruta protegida cuando Supabase confirma un usuario', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    const res = await middleware(buildRequest('/dashboard') as any);
    expect(res.type).toBe('next');
    expect(mockGetUser).toHaveBeenCalledTimes(1);
  });

  it('redirige a login si Supabase devuelve un error de autenticación', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'invalid token' } });
    const res = await middleware(buildRequest('/partner') as any);
    expect(res.type).toBe('redirect');
    expect((res as any).url.pathname).toBe('/login');
  });
});
