import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.fleetease.com.mx').replace(/\/$/, '');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');

  if (!supabaseUrl) {
    return NextResponse.json({ error: 'OAuth authorization server is not configured.' }, { status: 503 });
  }

  const resource = `${siteUrl}/api/mcp`;
  const authorizationServer = `${supabaseUrl}/auth/v1`;

  return NextResponse.json({
    resource,
    authorization_servers: [authorizationServer],
    bearer_methods_supported: ['header'],
    resource_name: 'FleetEase MCP — solo lectura',
  }, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
