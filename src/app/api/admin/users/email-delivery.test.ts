import type { NextRequest } from 'next/server';

process.env.RESEND_API_KEY = 'resend-test-key';

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

jest.mock('@/lib/admin-api-auth', () => ({
  requireAdmin: jest.fn(),
  supabaseAdmin: {
    from: jest.fn(),
    auth: { admin: { generateLink: jest.fn(), getUserById: jest.fn() } },
  },
}));

const { requireAdmin, supabaseAdmin } = require('@/lib/admin-api-auth');
const { POST: sendPasswordReset } = require('./send-password-reset/route') as { POST: (request: NextRequest) => Promise<Response> };
const { POST: resendWelcome } = require('./resend-welcome/route') as { POST: (request: NextRequest) => Promise<Response> };

const companyId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';
const email = 'person@example.test';

function targetQuery(target: Record<string, unknown>) {
  const builder = {
    select: jest.fn(),
    eq: jest.fn(),
    maybeSingle: jest.fn().mockResolvedValue({ data: target, error: null }),
    single: jest.fn().mockResolvedValue({ data: target, error: null }),
  };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  return builder;
}

function httpRequest(body: unknown) {
  return {
    headers: new Headers(),
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

beforeEach(() => {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: jest.fn().mockResolvedValue({ id: 'resend-message-id' }),
  });
  requireAdmin.mockResolvedValue({ profile: { id: 'admin', role: 'admin', company_id: companyId } });
  supabaseAdmin.from.mockReturnValue(targetQuery({ id: userId, company_id: companyId, email, is_deleted: false }));
  supabaseAdmin.auth.admin.generateLink.mockResolvedValue({
    data: { properties: { action_link: 'https://auth.example.test/recovery?token=test' } },
    error: null,
  });
  supabaseAdmin.auth.admin.getUserById.mockResolvedValue({ data: { user: { email } }, error: null });
});

afterEach(() => jest.clearAllMocks());

describe('admin user email routes', () => {
  it('sends password reset through Resend and reports success only after a message ID is returned', async () => {
    const response = await sendPasswordReset(httpRequest({ email }));

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith('https://api.resend.com/emails', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer resend-test-key' }),
    }));
    expect(JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)).toEqual(expect.objectContaining({ to: [email] }));
  });

  it('sends welcome email through Resend and reports success only after a message ID is returned', async () => {
    const response = await resendWelcome(httpRequest({ uid: userId }));

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith('https://api.resend.com/emails', expect.any(Object));
    expect(JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)).toEqual(expect.objectContaining({ to: [email] }));
  });

  it('does not send password reset email to a user in another company', async () => {
    supabaseAdmin.from.mockReturnValue(targetQuery({ id: userId, company_id: '33333333-3333-4333-8333-333333333333', email, is_deleted: false }));

    const response = await sendPasswordReset(httpRequest({ email }));

    expect(response.status).toBe(404);
    expect(supabaseAdmin.auth.admin.generateLink).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('does not report success when Resend returns no message ID', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue({}) });

    const response = await sendPasswordReset(httpRequest({ email }));

    expect(response.status).toBe(502);
  });
});
