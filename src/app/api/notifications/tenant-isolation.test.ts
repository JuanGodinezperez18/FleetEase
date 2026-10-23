import type { NextRequest } from 'next/server';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://ci-placeholder.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'ci-placeholder-service-role-key';

jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: jest.fn().mockResolvedValue(null),
  notificationLimiter: {},
}));
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

const { createClient } = require('@supabase/supabase-js') as { createClient: jest.Mock };
const { POST: sendNotification } = require('./send/route') as { POST: (request: NextRequest) => Promise<Response> };
const { POST: broadcastNotification } = require('./broadcast/route') as { POST: (request: NextRequest) => Promise<Response> };

const companyA = '11111111-1111-4111-8111-111111111111';
const companyB = '22222222-2222-4222-8222-222222222222';
const adminId = '33333333-3333-4333-8333-333333333333';
const recipientId = '44444444-4444-4444-8444-444444444444';

function query(result: unknown, insert = jest.fn()) {
  const builder: Record<string, jest.Mock | ((resolve: (value: unknown) => unknown) => unknown)> = {};
  for (const method of ['select', 'eq', 'in', 'insert']) {
    builder[method] = jest.fn((...args: unknown[]) => {
      if (method === 'insert') insert(...args);
      return builder;
    });
  }
  for (const method of ['single', 'maybeSingle', 'limit']) {
    builder[method] = jest.fn().mockResolvedValue(result);
  }
  builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return builder as unknown as {
    select: jest.Mock;
    eq: jest.Mock;
    in: jest.Mock;
    insert: jest.Mock;
    single: jest.Mock;
    maybeSingle: jest.Mock;
    limit: jest.Mock;
  } & PromiseLike<unknown>;
}

function httpRequest(body: unknown) {
  return {
    headers: new Headers({ Authorization: 'Bearer test-token' }),
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

afterEach(() => jest.clearAllMocks());

describe('notification API tenant isolation', () => {
  it('rejects a send to a recipient in another company before writing a notification', async () => {
    const insert = jest.fn();
    const usersResults = [
      { data: { role: 'admin', company_id: companyA, is_deleted: false }, error: null },
      { data: { id: recipientId, company_id: companyB, is_deleted: false }, error: null },
    ];
    const client = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: adminId } }, error: null }) },
      from: jest.fn((table: string) => {
        if (table === 'users') return query(usersResults.shift());
        return query({ data: null, error: null }, insert);
      }),
    };
    createClient.mockReturnValue(client);

    const response = await sendNotification(httpRequest({
      userId: recipientId,
      title: 'Aviso',
      body: 'Prueba de aislamiento',
    }));

    expect(response.status).toBe(403);
    expect(insert).not.toHaveBeenCalled();
  });

  it('rejects a broadcast containing a user outside the selected company before writing', async () => {
    const insert = jest.fn();
    const usersResults = [
      { data: { role: 'admin', company_id: companyA, is_deleted: false }, error: null },
      { data: [], error: null },
    ];
    const client = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: adminId } }, error: null }) },
      from: jest.fn((table: string) => {
        if (table === 'users') return query(usersResults.shift());
        return query({ data: null, error: null }, insert);
      }),
    };
    createClient.mockReturnValue(client);

    const response = await broadcastNotification(httpRequest({
      message: 'Prueba de aislamiento',
      recipientType: 'specific',
      selectedUsers: [recipientId],
      companyId: companyA,
    }));

    expect(response.status).toBe(403);
    expect(insert).not.toHaveBeenCalled();
  });
});
