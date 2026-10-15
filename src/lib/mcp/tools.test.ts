import { registerReadOnlyTools } from './tools';

function makeRequest(role = 'admin') {
  return new Request('https://www.fleetease.com.mx/api/mcp', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer test-token',
      'x-fleetease-mcp-user': 'user-1',
      'x-fleetease-mcp-company': 'company-1',
      'x-fleetease-mcp-role': role,
    },
  });
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

describe('MCP read-only tool registry', () => {
  it('registers only the approved read tools for a company admin', () => {
    const server = makeServer();
    registerReadOnlyTools(server, { requestInfo: makeRequest('admin') });

    expect([...server.tools.keys()].sort()).toEqual([
      'client_get',
      'clients_list',
      'credits_list',
      'expenses_list',
      'fines_list',
      'income_list',
      'partners_list',
      'vehicle_get',
      'vehicles_list',
    ]);
  });

  it('does not register writes or generic table/SQL tools', () => {
    const server = makeServer();
    registerReadOnlyTools(server, { requestInfo: makeRequest('editor') });

    for (const name of server.tools.keys()) {
      expect(name).not.toMatch(/create|update|delete|execute_sql|any_table/i);
    }
  });

  it('does not allow caller-supplied company scope in list schemas', () => {
    const server = makeServer();
    registerReadOnlyTools(server, { requestInfo: makeRequest('viewer') });

    for (const name of ['vehicles_list', 'clients_list', 'expenses_list', 'income_list', 'credits_list', 'partners_list', 'fines_list']) {
      const schema = server.tools.get(name)?.config.inputSchema;
      expect(schema).toBeDefined();
      expect(Object.keys(schema.shape)).not.toContain('company_id');
    }
  });

  it('does not register tenant tools for partner or client roles', () => {
    for (const role of ['partner', 'client', 'super_admin']) {
      const server = makeServer();
      registerReadOnlyTools(server, { requestInfo: makeRequest(role) });
      expect(server.tools.size).toBe(0);
    }
  });

  it('rejects missing trusted request context', () => {
    const server = makeServer();
    expect(() => registerReadOnlyTools(server, {})).toThrow('MCP request context is missing.');
  });
});
