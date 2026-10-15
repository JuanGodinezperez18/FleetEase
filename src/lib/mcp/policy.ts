/**
 * MCP tool authorization policy.
 *
 * This module is intentionally deny-by-default. It does not authenticate the
 * caller or resolve a company; callers must do both before consulting policy.
 * Partner/client tools stay disabled until their own-scope resolvers are tested.
 */
export type McpRole =
  | 'admin'
  | 'editor'
  | 'viewer'
  | 'super_admin'
  | 'partner'
  | 'client';

export const MCP_READ_TOOLS = [
  'vehicles_list',
  'vehicle_get',
  'clients_list',
  'client_get',
  'maintenance_list',
  'expenses_list',
  'income_list',
  'credits_list',
  'payments_list',
  'partners_list',
  'fines_list',
  'reports_generate',
  'dashboard_kpis',
  'connection_status',
] as const;

export type McpReadTool = (typeof MCP_READ_TOOLS)[number];

const READ_ROLES: ReadonlySet<McpRole> = new Set([
  'admin',
  'editor',
  'viewer',
]);

/**
 * Checks only the role/tool combination. Tenant scope, resource ownership,
 * active membership, subscription eligibility and authentication must be
 * validated separately for every request.
 */
export function canUseMcpReadTool(
  role: McpRole,
  tool: string,
): tool is McpReadTool {
  return (
    (MCP_READ_TOOLS as readonly string[]).includes(tool) &&
    READ_ROLES.has(role)
  );
}

/** No writes are enabled in the initial MCP pilot. */
export function isMcpWriteTool(_tool: string): boolean {
  return false;
}
