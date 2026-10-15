import { createClient } from '@supabase/supabase-js';
import { z } from 'zod/v4';
import type { Database } from '@/lib/supabase';
import { canUseMcpReadTool, type McpRole } from './policy';

type RequestContext = {
  requestInfo?: Request;
};

function getContext(requestInfo?: Request) {
  if (!requestInfo) throw new Error('MCP request context is missing.');
  const authorization = requestInfo.headers.get('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
  const userId = requestInfo.headers.get('x-fleetease-mcp-user') ?? '';
  const companyId = requestInfo.headers.get('x-fleetease-mcp-company') ?? '';
  const role = requestInfo.headers.get('x-fleetease-mcp-role') ?? '';
  const partnerId = requestInfo.headers.get('x-fleetease-mcp-partner') ?? '';
  const clientId = requestInfo.headers.get('x-fleetease-mcp-client') ?? '';

  if (!token || !userId || !companyId || !role) {
    throw new Error('MCP request is not authorized.');
  }

  if (role === 'partner' && !partnerId) {
    throw new Error('MCP request is not authorized.');
  }
  if (role === 'client' && !clientId) {
    throw new Error('MCP request is not authorized.');
  }

  return {
    token,
    userId,
    companyId,
    role: role as McpRole,
    partnerId: partnerId || null,
    clientId: clientId || null,
  };
}

/**
 * Uses the caller's Supabase JWT, never the service-role key, for all data
 * queries. RLS remains a second authorization boundary in addition to the
 * explicit company_id / own-scope predicates applied by each tool.
 */
function getScopedClient(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('Supabase is not configured.');

  return createClient<Database>(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { headers: { Authorization: 'Bearer ' + token } },
  });
}

const paginationSchema = z.object({
  limit: z.number().int().min(1).max(50).optional(),
  offset: z.number().int().min(0).max(10000).optional(),
}).strict();

function pagination(input: { limit?: number; offset?: number }) {
  return { limit: input.limit ?? 20, offset: input.offset ?? 0 };
}

function toolError(message = 'No fue posible completar la consulta. Revisa los permisos e inténtalo de nuevo.') {
  return { content: [{ type: 'text' as const, text: message }], isError: true };
}

function toolResult(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data) }] };
}

type ScopeCtx = ReturnType<typeof getContext>;

/** Own-scope filters for partner/client. Staff: company-wide only. */
function applyOwnScope(query: any, ctx: ScopeCtx, table: string) {
  if (ctx.role === 'client' && ctx.clientId) {
    if (table === 'clients') return query.eq('id', ctx.clientId);
    if (table === 'vehicles') return query.eq('client_id', ctx.clientId);
    if (table === 'credits') return query.eq('client_id', ctx.clientId);
    if (table === 'financial_records') return query.eq('client_id', ctx.clientId);
    if (table === 'multas') return query.eq('client_id', ctx.clientId);
  }
  if (ctx.role === 'partner' && ctx.partnerId) {
    if (table === 'partners') return query.eq('id', ctx.partnerId);
    if (table === 'vehicles') return query.eq('partner_id', ctx.partnerId);
    if (table === 'financial_records') return query.eq('partner_id', ctx.partnerId);
    // Clients/credits/fines linked via vehicles owned by this partner are
    // filtered with a subquery-style approach: only rows whose vehicle is
    // owned by the partner, or direct partner_id when present.
    if (table === 'clients') {
      // Clients assigned to vehicles of this partner
      return query.in(
        'id',
        // PostgREST: filter clients that have assigned_vehicle with partner_id
        // Fallback: only clients with a vehicle under this partner via client_id on vehicles
        // We use a two-step approach in the list helper when needed.
        [] as string[],
      );
    }
  }
  return query;
}

async function listCompanyRows(
  requestInfo: Request | undefined,
  table: string,
  fields: string,
  orderBy: string,
  input: { limit?: number; offset?: number },
  extraFilter?: (query: any) => any,
) {
  const ctx = getContext(requestInfo);
  const page = pagination(input);
  const client = getScopedClient(ctx.token);

  // Partner viewing clients: resolve client ids from their vehicles first.
  if (ctx.role === 'partner' && ctx.partnerId && table === 'clients') {
    const { data: vehicleRows, error: vehicleError } = await client
      .from('vehicles')
      .select('client_id')
      .eq('company_id', ctx.companyId)
      .eq('partner_id', ctx.partnerId)
      .eq('is_deleted', false)
      .not('client_id', 'is', null);
    if (vehicleError) throw new Error('Company-scoped read query failed.');
    const clientIds = [...new Set((vehicleRows ?? []).map((r: { client_id: string | null }) => r.client_id).filter(Boolean))] as string[];
    if (clientIds.length === 0) {
      return { items: [], pagination: { limit: page.limit, offset: page.offset, hasMore: false } };
    }
    let query = (client.from('clients' as any) as any)
      .select(fields)
      .eq('company_id', ctx.companyId)
      .eq('is_deleted', false)
      .in('id', clientIds);
    if (extraFilter) query = extraFilter(query);
    const { data, error } = await query
      .order(orderBy, { ascending: false })
      .range(page.offset, page.offset + page.limit - 1);
    if (error) throw new Error('Company-scoped read query failed.');
    return {
      items: data ?? [],
      pagination: { limit: page.limit, offset: page.offset, hasMore: (data?.length ?? 0) === page.limit },
    };
  }

  // Partner viewing credits/fines: via vehicles they own.
  if (ctx.role === 'partner' && ctx.partnerId && (table === 'credits' || table === 'multas')) {
    const { data: vehicleRows, error: vehicleError } = await client
      .from('vehicles')
      .select('id')
      .eq('company_id', ctx.companyId)
      .eq('partner_id', ctx.partnerId)
      .eq('is_deleted', false);
    if (vehicleError) throw new Error('Company-scoped read query failed.');
    const vehicleIds = (vehicleRows ?? []).map((r: { id: string }) => r.id);
    if (vehicleIds.length === 0) {
      return { items: [], pagination: { limit: page.limit, offset: page.offset, hasMore: false } };
    }
    let query = (client.from(table as any) as any)
      .select(fields)
      .eq('company_id', ctx.companyId)
      .eq('is_deleted', false)
      .in('vehicle_id', vehicleIds);
    if (extraFilter) query = extraFilter(query);
    const { data, error } = await query
      .order(orderBy, { ascending: false })
      .range(page.offset, page.offset + page.limit - 1);
    if (error) throw new Error('Company-scoped read query failed.');
    return {
      items: data ?? [],
      pagination: { limit: page.limit, offset: page.offset, hasMore: (data?.length ?? 0) === page.limit },
    };
  }

  let query = (client.from(table as any) as any)
    .select(fields)
    .eq('company_id', ctx.companyId)
    .eq('is_deleted', false);

  query = applyOwnScope(query, ctx, table);
  if (extraFilter) query = extraFilter(query);

  const { data, error } = await query
    .order(orderBy, { ascending: false })
    .range(page.offset, page.offset + page.limit - 1);

  if (error) {
    throw new Error('Company-scoped read query failed.');
  }

  return {
    items: data ?? [],
    pagination: {
      limit: page.limit,
      offset: page.offset,
      hasMore: (data?.length ?? 0) === page.limit,
    },
  };
}

export function registerReadOnlyTools(server: any, { requestInfo }: RequestContext) {
  const ctx = getContext(requestInfo);
  const register = (
    name: string,
    description: string,
    inputSchema: any,
    handler: (input: any) => Promise<unknown>,
  ) => {
    if (!canUseMcpReadTool(ctx.role, name)) return;
    server.registerTool(name, { description, inputSchema }, async (input: any) => {
      try {
        return toolResult(await handler(input));
      } catch {
        return toolError();
      }
    });
  };

  register(
    'vehicles_list',
    'Consulta vehículos permitidos según tu rol (empresa, socio o cliente).',
    paginationSchema,
    async (input) => listCompanyRows(
      requestInfo, 'vehicles',
      'id,alias,make,model,year,plate,color,status,client_id,partner_id,cost,weekly_rental_value,acquisition_date,maintenance_interval,last_maintenance_mileage,current_mileage,insurance_expiry_date,locked_by_credit,created_at',
      'created_at', input,
    ),
  );

  register(
    'vehicle_get',
    'Consulta un vehículo por ID dentro de tu alcance autorizado.',
    z.object({ id: z.string().uuid() }).strict(),
    async ({ id }) => {
      const ctx = getContext(requestInfo);
      const client = getScopedClient(ctx.token);
      let query = client.from('vehicles')
        .select('id,alias,make,model,year,plate,color,status,client_id,partner_id,cost,weekly_rental_value,acquisition_date,maintenance_interval,last_maintenance_mileage,current_mileage,insurance_expiry_date,locked_by_credit,created_at')
        .eq('company_id', ctx.companyId).eq('id', id).eq('is_deleted', false);
      if (ctx.role === 'client' && ctx.clientId) query = query.eq('client_id', ctx.clientId);
      if (ctx.role === 'partner' && ctx.partnerId) query = query.eq('partner_id', ctx.partnerId);
      const { data, error } = await query.maybeSingle();
      if (error) throw new Error('Vehicle query failed.');
      return data ?? { found: false };
    },
  );

  register(
    'clients_list',
    'Consulta clientes permitidos según tu rol. Omite domicilios e identificaciones oficiales.',
    paginationSchema,
    async (input) => listCompanyRows(
      requestInfo, 'clients',
      'id,firstname,lastname,email,phone,status,initial_balance,balance,security_deposit,assigned_vehicle_id,license_expiry,license_status,has_active_credit,created_at',
      'created_at', input,
    ),
  );

  register(
    'client_get',
    'Consulta un cliente por ID dentro de tu alcance autorizado.',
    z.object({ id: z.string().uuid() }).strict(),
    async ({ id }) => {
      const ctx = getContext(requestInfo);
      const client = getScopedClient(ctx.token);
      let query = client.from('clients')
        .select('id,firstname,lastname,email,phone,status,initial_balance,balance,security_deposit,assigned_vehicle_id,license_expiry,license_status,has_active_credit,created_at')
        .eq('company_id', ctx.companyId).eq('id', id).eq('is_deleted', false);
      if (ctx.role === 'client' && ctx.clientId) query = query.eq('id', ctx.clientId);
      if (ctx.role === 'partner' && ctx.partnerId) {
        // Must be a client on one of the partner's vehicles
        const { data: link } = await client.from('vehicles')
          .select('id')
          .eq('company_id', ctx.companyId)
          .eq('partner_id', ctx.partnerId)
          .eq('client_id', id)
          .eq('is_deleted', false)
          .limit(1)
          .maybeSingle();
        if (!link) return { found: false };
      }
      const { data, error } = await query.maybeSingle();
      if (error) throw new Error('Client query failed.');
      return data ?? { found: false };
    },
  );

  register(
    'expenses_list',
    'Consulta gastos registrados dentro de tu alcance autorizado.',
    paginationSchema,
    async (input) => listCompanyRows(
      requestInfo, 'financial_records',
      'id,type,category,amount,payment_method,description,date,client_id,vehicle_id,partner_id,credit_id,is_pending,reference_code,created_at',
      'date', input, (query) => query.eq('type', 'expense'),
    ),
  );

  register(
    'income_list',
    'Consulta ingresos registrados dentro de tu alcance autorizado.',
    paginationSchema,
    async (input) => listCompanyRows(
      requestInfo, 'financial_records',
      'id,type,category,amount,payment_method,description,date,client_id,vehicle_id,partner_id,credit_id,is_pending,reference_code,created_at',
      'date', input, (query) => query.eq('type', 'income'),
    ),
  );

  register(
    'credits_list',
    'Consulta créditos dentro de tu alcance autorizado (solo lectura).',
    paginationSchema,
    async (input) => listCompanyRows(
      requestInfo, 'credits',
      'id,client_id,vehicle_id,total_amount,paid_amount,remaining_balance,weekly_payment,number_of_payments,payments_made,start_date,status,last_payment_date,last_payment_amount,last_payment_status,reference_code,created_at',
      'created_at', input,
    ),
  );

  register(
    'partners_list',
    'Consulta socios permitidos según tu rol (staff: todos; socio: solo el propio).',
    paginationSchema,
    async (input) => listCompanyRows(
      requestInfo, 'partners',
      'id,firstname,lastname,name,initial_balance,balance,vehicle_limit,created_at',
      'created_at', input,
    ),
  );

  register(
    'fines_list',
    'Consulta multas dentro de tu alcance autorizado, sin URLs de evidencias.',
    paginationSchema,
    async (input) => listCompanyRows(
      requestInfo, 'multas',
      'id,vehicle_id,client_id,folio,fecha_infraccion,descripcion,importe,recargos,total,status,fecha_pago,assignment_date,created_at',
      'created_at', input,
    ),
  );
}
