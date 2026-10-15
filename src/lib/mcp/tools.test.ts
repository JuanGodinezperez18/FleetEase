import { registerReadOnlyTools } from './tools';

function makeRequest(role = 'admin', extra: Record<string, string> = {}) {
  const values: Record<string, string> = {
    authorization: 'Bearer test-token',
    'x-fleetease-mcp-user': 'user-1',
    'x-fleetease-mcp-company': 'company-1',
    'x-fleetease-mcp-role': role,
    ...extra,
  };
  return {
    headers: { get: (name: string) => values[name.toLowerCase()] ?? null },
  } as unknown as Request;
}

function makeServer() {
  const tools = new Map<string, { config: any; handler: any }>();
  return {
    tools,
    registerTool(name: string, config: any, handler: any) {
      tools.set(name, { config, handler });
    },
  };
}

const STAFF_READ_TOOLS = [
  'client_get',
  'clients_list',
  'credits_list',
  'expenses_list',
  'fines_list',
  'income_list',
  'partners_list',
  'vehicle_get',
  'vehicles_list',
];

describe('MCP read-only tool registry', () => {
  it.each(['admin', 'editor', 'viewer', 'super_admin'] as const) (
    'registers the approved read tools for staff role %s',
    (role) => {
      const server = makeServer();
      registerReadOnlyTools(server, { requestInfo: makeRequest(role) });
      expect([...server.tools.keys()].sort()).toEqual(STAFF_READ_TOOLS);
    },
  );

  it('registers partner tools when partner scope header is present', () => {
    const server = makeServer();
    registerReadOnlyTools(server, {
      requestInfo: makeRequest('partner', { 'x-fleetease-mcp-partner': 'partner-1' }),
    });
    expect([...server.tools.keys()].sort()).toEqual(STAFF_READ_TOOLS);
  });

  it('registers client tools without partners_list when client scope is present', () => {
    const server = makeServer();
    registerReadOnlyTools(server, {
      requestInfo: makeRequest('client', { 'x-fleetease-mcp-client': 'client-1' }),
    });
    expect([...server.tools.keys()].sort()).toEqual([
      'client_get',
      'clients_list',
      'credits_list',
      'expenses_list',
      'fines_list',
      'income_list',
      'vehicle_get',
      'vehicles_list',
    ]);
  });

  it('rejects partner without partner scope header', () => {
    const server = makeServer();
    expect(() => registerReadOnlyTools(server, { requestInfo: makeRequest('partner') })).toThrow(
      'MCP request is not authorized.',
    );
  });

  it('rejects client without client scope header', () => {
    const server = makeServer();
    expect(() => registerReadOnlyTools(server, { requestInfo: makeRequest('client') })).toThrow(
      'MCP request is not authorized.',
    );
  });

  it('does not register writes or generic table/SQL tools', () => {
    const server = makeServer();
    registerReadOnlyTools(server, { requestInfo: makeRequest('admin') });

    for (const name of server.tools.keys()) {
      expect(name).not.toMatch(/create|update|delete|execute_sql|any_table/i);
    }
  });

  it('does not allow caller-supplied company scope in list schemas', () => {
    const server = makeServer();
    registerReadOnlyTools(server, { requestInfo: makeRequest('admin') });

    for (const name of ['vehicles_list', 'clients_list', 'expenses_list', 'income_list', 'credits_list', 'partners_list', 'fines_list']) {
      const schema = server.tools.get(name)?.config.inputSchema;
      expect(schema).toBeDefined();
      expect(Object.keys(schema.shape)).not.toContain('company_id');
    }
  });

  it('rejects missing trusted request context', () => {
    const server = makeServer();
    expect(() => registerReadOnlyTools(server, {})).toThrow('MCP request context is missing.');
  });
});
