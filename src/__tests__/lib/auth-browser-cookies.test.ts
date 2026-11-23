import { authBrowserCookies } from '@/lib/auth-browser-cookies';

jest.mock('@supabase/ssr', () => jest.requireActual('@supabase/ssr'));

describe('SSR browser session refresh cookies', () => {
  let cookieHeader: string;
  let writes: string[];

  beforeEach(() => {
    cookieHeader = '';
    writes = [];
    jest.spyOn(document, 'cookie', 'get').mockImplementation(() => cookieHeader);
    jest.spyOn(document, 'cookie', 'set').mockImplementation(value => { writes.push(value); });
  });
  afterEach(() => jest.restoreAllMocks());

  it('keeps refreshed cookie chunks session-only and expires stale chunks', () => {
    cookieHeader = 'fleetease-auth-persistence=session; sb-test-auth-token.0=old';
    authBrowserCookies.setAll([
      { name: 'sb-test-auth-token.0', value: 'new', options: { maxAge: 3600, expires: new Date('2030-01-01') } },
      { name: 'sb-test-auth-token.1', value: '', options: { maxAge: 0 } },
    ]);
    expect(writes[0]).not.toMatch(/Max-Age|Expires/i);
    expect(writes[0]).toContain('SameSite=Lax');
    expect(writes[0]).toContain('Path=/');
    expect(writes[1]).toContain('Max-Age=0');
  });

  it.each(['fleetease-auth-persistence=persistent', ''])(
    'preserves the SDK lifetime for persistent and pre-existing sessions (%s)', header => {
      cookieHeader = header;
      authBrowserCookies.setAll([{ name: 'sb-test-auth-token', value: 'new', options: { maxAge: 3600 } }]);
      expect(writes[0]).toContain('Max-Age=3600');
    },
  );

  it('reads all chunks through the SDK cookie parser', () => {
    cookieHeader = 'sb-test-auth-token.0=one; sb-test-auth-token.1=two%3D';
    expect(authBrowserCookies.getAll()).toEqual([
      { name: 'sb-test-auth-token.0', value: 'one' },
      { name: 'sb-test-auth-token.1', value: 'two=' },
    ]);
  });
});
