// Isolated test identity: never valid against a real Supabase instance.
const userId = '11111111-1111-4111-8111-111111111111';
const companyId = '22222222-2222-4222-8222-222222222222';
const user = { id: userId, email: 'csp-test@example.invalid', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, identities: [], factors: [], created_at: '2026-01-01T00:00:00Z' };
const profile = { id: userId, company_id: companyId, role: 'admin', name: 'CSP Test', email: user.email, is_deleted: false, created_at: user.created_at };
function fixtureResponse(url, accept = '') {
  if (url.pathname === '/auth/v1/user') return user;
  if (url.pathname === '/rest/v1/users') return accept.includes('object+json') ? profile : [profile];
  return [];
}
module.exports = { user, profile, fixtureResponse };

if (process.env.FLEETEASE_CSP_FIXTURE === '1') {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    if (url.hostname !== 'ci-placeholder.supabase.co') return originalFetch(input, init);
    const method = (init?.method ?? input?.method ?? 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'HEAD') throw new Error('CSP fixture rejects writes');
    const headers = new Headers(init?.headers ?? input?.headers);
    return new Response(JSON.stringify(fixtureResponse(url, headers.get('accept') ?? '')), {
      headers: { 'Content-Type': 'application/json' },
    });
  };
}
