import { createHash, randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { getSafeStoragePath } from '@/lib/security/safe-storage-path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const SHARED_LINK_BUCKETS = new Set(['vehicle-documents', 'vehicle-images']);
export const SHARED_LINK_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
export const SHARED_LINK_TTL_HOURS = [1, 24, 168] as const;

export type SharedLinkProfile = {
  id: string;
  company_id: string | null;
  role: string;
  is_deleted?: boolean | null;
};

export function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) throw new Error('Shared link storage unavailable');
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function getSupabaseHost(): string {
  if (!SUPABASE_URL) throw new Error('Shared link storage unavailable');
  return new URL(SUPABASE_URL).hostname;
}

export function generateShareToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashShareToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function isValidShareToken(token: unknown): token is string {
  return typeof token === 'string' && SHARED_LINK_TOKEN_PATTERN.test(token);
}

export function getShortLink(token: string): string {
  // Preview links must stay on their own deployment instead of pointing at production.
  if (process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL) {
    const previewHost = process.env.VERCEL_URL;
    if (!/^[a-z0-9.-]+\.vercel\.app$/i.test(previewHost)) {
      throw new Error('Invalid preview URL configuration');
    }
    return `https://${previewHost}/s/${token}`;
  }

  const base = (process.env.NEXT_PUBLIC_APP_URL || 'https://fleetease.com.mx').replace(/\/$/, '');
  const configured = new URL(base);
  if (configured.protocol !== 'https:' || !['fleetease.com.mx', 'www.fleetease.com.mx'].includes(configured.hostname)) {
    throw new Error('Invalid public application URL configuration');
  }
  return `${base}/s/${token}`;
}

export function sanitizeDocumentLabel(value: unknown): string {
  if (typeof value !== 'string') return 'Documento del vehículo';
  const label = value.normalize('NFKC').replace(/[<>\u0000-\u001F\u007F]/g, '').trim().slice(0, 80);
  return label || 'Documento del vehículo';
}

export function safeFileName(value: unknown): string {
  if (typeof value !== 'string') return 'documento';
  const cleaned = value.normalize('NFKC').replace(/[\\/\u0000-\u001F\u007F"<>:|?*]/g, '_').replace(/\.{2,}/g, '.').trim().slice(0, 120);
  return cleaned || 'documento';
}

export function isSuperAdmin(role: string | null | undefined): boolean {
  return role === 'super_admin' || role === 'superAdmin';
}

export function canCreateSharedLink(role: string | null | undefined): boolean {
  return ['admin', 'editor', 'manager', 'super_admin', 'superAdmin'].includes(role || '');
}

export function canManageSharedLinks(role: string | null | undefined): boolean {
  return role === 'admin' || isSuperAdmin(role);
}

export async function getAuthenticatedProfile(request: Request): Promise<{
  admin: ReturnType<typeof getSupabaseAdmin>;
  user: { id: string };
  profile: SharedLinkProfile;
} | null> {
  const authorization = request.headers.get('authorization');
  if (!authorization || !/^Bearer\s+\S+$/.test(authorization)) return null;
  const admin = getSupabaseAdmin();
  const { data: auth, error: authError } = await admin.auth.getUser(authorization.slice(7));
  if (authError || !auth.user) return null;
  const { data: profile, error } = await admin
    .from('users')
    .select('id, company_id, role, is_deleted')
    .eq('id', auth.user.id)
    .maybeSingle();
  if (error || !profile || profile.is_deleted) return null;
  return { admin, user: { id: auth.user.id }, profile: profile as SharedLinkProfile };
}

export function parseVehicleStorageReference(fileUrl: unknown): { bucket: string; path: string } | null {
  if (typeof fileUrl !== 'string' || fileUrl.length > 4096) return null;
  let parsed: URL;
  try { parsed = new URL(fileUrl); } catch { return null; }
  if (parsed.protocol !== 'https:' || parsed.hostname !== getSupabaseHost() || parsed.port || parsed.username || parsed.password) return null;
  const match = parsed.pathname.match(/^\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/);
  if (!match || !SHARED_LINK_BUCKETS.has(match[1])) return null;
  const path = getSafeStoragePath(match[2]);
  if (!path) return null;
  const segments = path.split('/');
  if (segments.length !== 6 || segments[0] !== 'companies' || segments[2] !== 'vehicles') return null;
  if (!/^[0-9a-f-]{36}$/i.test(segments[1]) || !/^[0-9a-f-]{36}$/i.test(segments[3])) return null;
  if (match[1] === 'vehicle-documents' && segments[4] !== 'documents') return null;
  if (match[1] === 'vehicle-images' && segments[4] !== 'images') return null;
  if (!segments[5] || segments[5] === '.' || segments[5] === '..') return null;
  return { bucket: match[1], path };
}

export function getLinkState(link: {
  expires_at: string;
  revoked_at: string | null;
  single_use: boolean;
  used_at: string | null;
}): 'active' | 'expired' | 'revoked' | 'used' {
  if (link.revoked_at) return 'revoked';
  if (Date.parse(link.expires_at) <= Date.now()) return 'expired';
  if (link.single_use && link.used_at) return 'used';
  return 'active';
}

export function sharedLinkSecurityHeaders(): Record<string, string> {
  return {
    'Cache-Control': 'private, no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
  };
}
