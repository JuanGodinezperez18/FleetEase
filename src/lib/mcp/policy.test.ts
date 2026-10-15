import {
  canUseMcpReadTool,
  isMcpWriteTool,
  MCP_READ_TOOLS,
  type McpRole,
} from './policy';

describe('MCP deny-by-default policy', () => {
  it.each(['admin', 'editor', 'viewer', 'super_admin'] as const) (
    'allows all registered read tools for staff role %s',
    (role) => {
      for (const tool of MCP_READ_TOOLS) {
        expect(canUseMcpReadTool(role, tool)).toBe(true);
      }
      expect(canUseMcpReadTool(role, 'execute_sql')).toBe(false);
      expect(canUseMcpReadTool(role, 'vehicle_delete')).toBe(false);
    },
  );

  it('allows client own-scope tools and denies partners_list', () => {
    expect(canUseMcpReadTool('client', 'vehicles_list')).toBe(true);
    expect(canUseMcpReadTool('client', 'client_get')).toBe(true);
    expect(canUseMcpReadTool('client', 'credits_list')).toBe(true);
    expect(canUseMcpReadTool('client', 'fines_list')).toBe(true);
    expect(canUseMcpReadTool('client', 'partners_list')).toBe(false);
  });

  it('allows partner own-scope tools including partners_list', () => {
    for (const tool of MCP_READ_TOOLS) {
      expect(canUseMcpReadTool('partner', tool)).toBe(true);
    }
  });

  it.each([
    'expense_create',
    'credit_create',
    'payment_delete',
    'fine_create',
    'execute_sql',
    'update_any_table',
    'delete_record',
  ])('does not enable write or generic tool %s', (tool) => {
    expect(isMcpWriteTool(tool)).toBe(false);
    expect(canUseMcpReadTool('admin', tool)).toBe(false);
  });

  it('does not treat unknown roles as authorized', () => {
    expect(canUseMcpReadTool('unknown' as McpRole, 'vehicles_list')).toBe(false);
  });
});
