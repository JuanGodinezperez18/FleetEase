import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/admin-api-auth';
import { apiLimiter } from '@/lib/rate-limit';
import { registerReadOnlyTools } from '@/lib/mcp/tools';
import type { McpRole } from '@/lib/mcp/policy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 64 * 1024;
const MCP_PUBLIC_BASE_URL = (process.env.MCP_PUBLIC_BASE_URL || 'https://www.fleetease.com.mx').replace(/\\/+$/, '');
const MCP_RESOURCE_METADATA_URL = `${MCP_PUBLIC_BASE_URL}/.well-known/oauth-protected-resource/api/mcp`;
const ALLOWED_ROLES = new Set<McpRole>(['admin', 'editor', 'viewer']);

const mcpHandler = createMcpHandler(({ requestInfo }) => {
  const server = new McpServer({
    name: 'FleetEase',
    version: '0.1.0',
  });
  registerReadOnlyTools(server, { requestInfo });
  return server;
}, { responseMode: 'json' });

function allowedOrigin(request: Request): string | null | false {
  const origin = request.headers.get('origin');
  if (!origin) return null;

  const configured = (process.env.MCP_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  // Server-to-server MCP clients normally omit Origin. Browser-origin requests
  // are denied unless the operator explicitly configures the exact origin.
  return configured.includes(origin) ? origin : false;
}

function withSecurityHeaders(response: Response, origin: string | null): Response {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'private, no-store, max-age=0');
  headers.set('Pragma', 'no-cache');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'no-referrer');
  if (origin) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', 'POST, GET, DELETE, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept, MCP-Protocol-Version, Mcp-Session-Id, Last-Event-ID');
    headers.set('Access-Control-Expose-Headers', 'MCP-Protocol-Version, Mcp-Session-Id');
    headers.append('Vary', 'Origin');
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function handleMcp(request: NextRequest): Promise<Response> {
  const origin = allowedOrigin(request);
  if (origin === false) {
    return NextResponse.json({ error: 'Origin not allowed.' }, { status: 403 });
  }

  if (request.method === 'OPTIONS') {
    const headers = new Headers();
    if (origin) {
      headers.set('Access-Control-Allow-Origin', origin);
      headers.set('Access-Control-Allow-Methods', 'POST, GET, DELETE, OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept, MCP-Protocol-Version, Mcp-Method, Mcp-Name');
      headers.set('Access-Control-Max-Age', '600');
      headers.append('Vary', 'Origin');
    }
    return new Response(null, { status: 204, headers });
  }

  if (request.method === 'POST') {
    const declaredLength = Number(request.headers.get('content-length') ?? 0);
    if (declaredLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Request body too large.' }, { status: 413 });
    }
    const stream = request.clone().body;
    if (stream) {
      const reader = stream.getReader();
      let totalBytes = 0;
      try {
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          totalBytes += chunk.value.byteLength;
          if (totalBytes > MAX_BODY_BYTES) {
            await reader.cancel();
            return NextResponse.json({ error: 'Request body too large.' }, { status: 413 });
          }
        }
      } finally {
        reader.releaseLock();
      }
    }
  }

  const ip = request.headers.get('x-real-ip')
    ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? 'unknown';
  let ipLimit;
  try {
    ipLimit = await apiLimiter.check(`mcp:ip:${ip}`);
  } catch {
    return NextResponse.json({ error: 'Rate limiting is temporarily unavailable.' }, { status: 503 });
  }
  if (ipLimit.limited) {
    return NextResponse.json({ error: 'Rate limit exceeded.' }, {
      status: 429,
      headers: { 'Retry-After': String(Math.max(1, Math.ceil((ipLimit.resetAt - Date.now()) / 1000))) },
    });
  }

  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Bearer token required.' },
      { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } },
    );
  }

  const token = authorization.slice(7).trim();
  if (!token || token.length > 8192) {
    return NextResponse.json({ error: 'Invalid bearer token.' }, { status: 401 });
  }

  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData.user) {
      return NextResponse.json(
        { error: 'Invalid or expired bearer token.' },
        { status: 401, headers: { 'WWW-Authenticate': 'Bearer error="invalid_token"' } },
      );
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id,role,company_id,is_deleted')
      .eq('id', authData.user.id)
      .eq('is_deleted', false)
      .maybeSingle();

    if (profileError || !profile || !profile.company_id) {
      return NextResponse.json({ error: 'Active FleetEase company profile required.' }, { status: 403 });
    }

    const role = profile.role as McpRole;
    if (!ALLOWED_ROLES.has(role)) {
      return NextResponse.json({ error: 'Role is not enabled for the read-only MCP pilot.' }, { status: 403 });
    }

    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('id,is_deleted')
      .eq('id', profile.company_id)
      .eq('is_deleted', false)
      .maybeSingle();

    if (companyError || !company) {
      return NextResponse.json({ error: 'Active company required.' }, { status: 403 });
    }

    const userLimit = await apiLimiter.check(`mcp:user:${authData.user.id}`);
    if (userLimit.limited) {
      return NextResponse.json({ error: 'Rate limit exceeded.' }, {
        status: 429,
        headers: { 'Retry-After': String(Math.max(1, Math.ceil((userLimit.resetAt - Date.now()) / 1000))) },
      });
    }

    // Remove any caller-supplied internal identity headers before setting
    // server-verified values. The raw JWT remains only for RLS-scoped reads.
    const headers = new Headers(request.headers);
    headers.delete('x-fleetease-mcp-user');
    headers.delete('x-fleetease-mcp-company');
    headers.delete('x-fleetease-mcp-role');
    headers.set('x-fleetease-mcp-user', authData.user.id);
    headers.set('x-fleetease-mcp-company', profile.company_id);
    headers.set('x-fleetease-mcp-role', role);

    const securedRequest = new Request(request, { headers });
    const response = await mcpHandler.fetch(securedRequest);
    return withSecurityHeaders(response, origin);
  } catch {
    // Never disclose service-role, SQL, or internal SDK error details.
    return NextResponse.json({ error: 'MCP request could not be processed.' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  return handleMcp(request);
}

export async function GET(request: NextRequest) {
  return handleMcp(request);
}

export async function DELETE(request: NextRequest) {
  return handleMcp(request);
}

export async function OPTIONS(request: NextRequest) {
  return handleMcp(request);
}
