import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/admin-api-auth';
import { apiLimiter, checkRateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const limited = await checkRateLimit(request, apiLimiter, 'ip');
  if (limited) return limited;
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const token = authorization.slice(7);
  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
  }

  const { data: profile, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', authData.user.id)
    .eq('is_deleted', false)
    .single();

  if (error || !profile) {
    return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
  }

  return NextResponse.json({ profile }, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
