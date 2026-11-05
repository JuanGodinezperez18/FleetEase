import type { NextRequest, NextResponse } from 'next/server';
import { POST } from './route';
import { GET as profile } from '../profile/route';
import { POST as logout } from '../../logout/route';

jest.mock('next/server', () => ({
  NextResponse: { json: (body: unknown, init?: any) => {
    const jar = new Map();
    return { status: init?.status ?? 200, headers: new Headers(init?.headers), json: async () => body,
      cookies: { set: (cookie: any) => jar.set(cookie.name, cookie), get: (name: string) => jar.get(name) } };
  } },
}));

jest.mock('@/lib/rate-limit', () => ({ checkRateLimit: jest.fn(), authLimiter: {}, apiLimiter: {} }));
jest.mock('@supabase/ssr', () => ({ createServerClient: jest.fn() }));
jest.mock('@/lib/admin-api-auth', () => ({ supabaseAdmin: { auth: { getUser: jest.fn() } } }));
jest.mock('next/headers', () => ({ cookies: jest.fn() }));
const { checkRateLimit } = require('@/lib/rate-limit');
const { createServerClient } = require('@supabase/ssr');

function request(body: unknown, origin = 'https://fleetease.com.mx') {
  return { url: 'https://fleetease.com.mx/api/auth/login', headers: new Headers({ origin }),
    cookies: { getAll: () => [] }, json: async () => body } as unknown as NextRequest;
}
const credentials = { email: 'test@example.com', password: 'valid-password', rememberMe: false };

describe('password login gateway', () => {
  beforeEach(() => { jest.clearAllMocks(); checkRateLimit.mockResolvedValue(null); });

  it('returns rate-limit failure before contacting Supabase', async () => {
    checkRateLimit.mockResolvedValue({ status: 429 });
    expect((await POST(request(credentials))).status).toBe(429);
    expect(checkRateLimit).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'ip');
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it('rejects cross-origin login requests', async () => {
    expect((await POST(request(credentials, 'https://attacker.example'))).status).toBe(403);
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it('limits profile requests before validating a token or querying a profile', async () => {
    checkRateLimit.mockResolvedValue({ status: 429 });
    expect((await profile(request(credentials))).status).toBe(429);
    expect(require('@/lib/admin-api-auth').supabaseAdmin.auth.getUser).not.toHaveBeenCalled();
    expect(checkRateLimit).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'ip');
  });

  it('limits server logout before accessing the cookie session', async () => {
    checkRateLimit.mockResolvedValue({ status: 429 });
    expect((await logout(request(credentials))).status).toBe(429);
    expect(require('next/headers').cookies).not.toHaveBeenCalled();
  });

  it('rejects malformed input', async () => {
    expect((await POST(request({ email: 'invalid' }))).status).toBe(400);
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it('sets hardened SSR session cookies and returns session only with an active profile', async () => {
    const query = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { id: 'u', is_deleted: false }, error: null }) };
    createServerClient.mockImplementation((_url: string, _key: string, options: any) => ({
      auth: {
        signInWithPassword: jest.fn(async () => {
          options.cookies.setAll([{ name: 'sb-test-auth-token', value: 'session', options: { maxAge: 1234 } }]);
          return { data: { user: { id: 'u' }, session: { access_token: 'access', refresh_token: 'refresh' } }, error: null };
        }),
      }, from: () => query,
    }));
    const result = await POST(request(credentials));
    expect(result.status).toBe(200);
    expect(result.headers.get('cache-control')).toContain('no-store');
    const cookie = (result as NextResponse).cookies.get('sb-test-auth-token');
    expect(cookie).toMatchObject({ value: 'session', sameSite: 'lax', path: '/', httpOnly: false });
    expect(cookie).not.toHaveProperty('maxAge');
    expect(await result.json()).toMatchObject({ session: { access_token: 'access' }, profile: { id: 'u' } });
  });

  it('does not expose sessions for a missing/deleted profile', async () => {
    const query = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null, error: null }) };
    createServerClient.mockReturnValue({ auth: { signInWithPassword: jest.fn().mockResolvedValue({ data: { user: { id: 'u' }, session: { access_token: 'access' } }, error: null }), signOut: jest.fn().mockResolvedValue({ error: null }) }, from: () => query });
    const result = await POST(request(credentials));
    expect(result.status).toBe(403);
    expect(await result.json()).not.toHaveProperty('session');
  });
});
