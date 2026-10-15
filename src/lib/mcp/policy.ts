/**
 * MCP tool authorization policy.
 *
 * This module is intentionally deny-by-default. It does not authenticate the
 * caller or resolve a company; callers must do both before consulting policy.
 * Partner/client tools are allowed, but tools.ts must apply own-scope filters.
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
  'expenses_list',
  'income_list',
  'credits_list',
  'partners_list',
  'fines_list',
] as const;

export type McpReadTool = (typeof MCP_READ_TOOLS)[number];

/** Staff: company-wide reads. Partner/client: own-scope only (enforced in tools). */
const READ_ROLES: ReadonlySet<McpRole> = new Set([
  'admin',
  'editor',
  'viewer',
  'super_admin',
  'partner',
  'client',
]);

/** Tools a client may use (self + assigned records). */
const CLIENT_TOOLS: ReadonlySet<string> = new Set([
  'vehicles_list',
  'vehicle_get',
  'clients_list',
  'client_get',
  'expenses_list',
  'income_list',
  'credits_list',
  'fines_list',
]);

/** Tools a partner may use (own partner row + linked vehicles/finances). */
const PARTNER_TOOLS: ReadonlySet<string> = new Set([
  'vehicles_list',
  'vehicle_get',
  'clients_list',
  'client_get',
  'expenses_list',
  'income_list',
  'credits_list',
  'partners_list',
  'fines_list',
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
  if (!(MCP_READ_TOOLS as readonly string[]).includes(tool)) return false;
  if (!READ_ROLES.has(role)) return false;
  if (role === 'client') return CLIENT_TOOLS.has(tool);
  if (role === 'partner') return PARTNER_TOOLS.has(tool);
  return true;
}

/** No writes are enabled in the initial MCP pilot. */
export function isMcpWriteTool(_tool: string): boolean {
  return false;
}
