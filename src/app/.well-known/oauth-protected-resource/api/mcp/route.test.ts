import { GET } from './route';

describe('MCP protected resource metadata', () => {
  const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalPublicBaseUrl = process.env.MCP_PUBLIC_BASE_URL;

  afterEach(() => {
    if (originalSupabaseUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
    if (originalPublicBaseUrl === undefined) delete process.env.MCP_PUBLIC_BASE_URL;
    else process.env.MCP_PUBLIC_BASE_URL = originalPublicBaseUrl;
  });

  it('publishes the canonical MCP resource and Supabase authorization server', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://qettktslcbjjuyejcpqy.supabase.co/';
    process.env.MCP_PUBLIC_BASE_URL = 'https://www.fleetease.com.mx/';

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.resource).toBe('https://www.fleetease.com.mx/api/mcp');
    expect(body.authorization_servers).toEqual([
      'https://qettktslcbjjuyejcpqy.supabase.co/auth/v1',
    ]);
    expect(body.bearer_methods_supported).toEqual(['header']);
  });

  it('fails closed if the Supabase authorization server is not configured', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const response = await GET();
    expect(response.status).toBe(503);
  });
});
