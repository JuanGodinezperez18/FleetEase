/**
 * Rate Limiting para FleetEase Manager
 *
 * Implementación de rate limiting sin dependencias externas.
 * Usa un almacenamiento en memoria con expiración por TTL.
 *
 * Para producción con múltiples servidores (Vercel), usar
 * @upstash/ratelimit con Redis para rate limiting distribuido.
 *
 * Uso:
 * ```typescript
 * import { rateLimiter, RateLimitConfig } from '@/lib/rate-limit';
 *
 * const limiter = rateLimiter({
 *   windowMs: 15 * 60 * 1000, // 15 minutos
 *   max: 100,                  // 100 requests por ventana
 * });
 *
 * // En una API route:
 * const result = await limiter.check(identifier);
 * if (result.limited) {
 *   return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 });
 * }
 * ```
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  success: boolean;
  limited: boolean;
  remaining: number;
  total: number;
  resetAt: number;
}

export interface RateLimitConfig {
  /** Ventana de tiempo en milisegundos */
  windowMs: number;
  /** Máximo de solicitudes por ventana */
  max: number;
  /** Prefijo para las claves (útil para namespaces) */
  prefix?: string;
}

// Almacenamiento en memoria compartido
const store = new Map<string, RateLimitEntry>();

// Limpieza periódica de entradas expiradas
const CLEANUP_INTERVAL = 60 * 1000; // cada 1 minuto
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}, CLEANUP_INTERVAL);

class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Verifica si un identificador ha excedido el límite.
   * Si no ha excedido, incrementa el contador.
   */
  async check(identifier: string): Promise<RateLimitResult> {
    const { windowMs, max, prefix } = this.config;
    const key = prefix ? `${prefix}:${identifier}` : identifier;
    const now = Date.now();

    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (redisUrl || redisToken) {
      if (!redisUrl || !redisToken) throw new Error('Configura UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN juntos.');

      const redisKey = `fleetease:rate-limit:${key}`;
      const script = "local count = redis.call('INCR', KEYS[1]); if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]); end; return { count, redis.call('PTTL', KEYS[1]) }";
      const response = await fetch(redisUrl.replace(/\/+$/, ''), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${redisToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['EVAL', script, '1', redisKey, String(windowMs)]),
        signal: AbortSignal.timeout(3000),
        cache: 'no-store',
      });
      if (!response.ok) throw new Error(`Upstash rate limiter failed with status ${response.status}.`);
      const payload = await response.json() as { result?: [number, number]; error?: string };
      if (payload.error || !Array.isArray(payload.result) || payload.result.length !== 2) {
        throw new Error('Upstash returned an invalid rate-limit response.');
      }
      const [count, ttl] = payload.result;
      const resetAt = now + Math.max(0, ttl);
      const limited = count > max;
      return {
        success: true,
        limited,
        remaining: Math.max(0, max - count),
        total: max,
        resetAt,
      };
    }

    const entry = store.get(key);

    // Si no existe o expiró, crear nueva entrada
    if (!entry || entry.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return {
        success: true,
        limited: false,
        remaining: max - 1,
        total: max,
        resetAt: now + windowMs,
      };
    }

    // Si ya excedió el límite
    if (entry.count >= max) {
      return {
        success: true,
        limited: true,
        remaining: 0,
        total: max,
        resetAt: entry.resetAt,
      };
    }

    // Incrementar contador
    entry.count += 1;
    return {
      success: true,
      limited: false,
      remaining: max - entry.count,
      total: max,
      resetAt: entry.resetAt,
    };
  }

  /**
   * Resetea manualmente un identificador.
   */
  async reset(identifier: string): Promise<void> {
    const { prefix } = this.config;
    const key = prefix ? `${prefix}:${identifier}` : identifier;
    store.delete(key);
  }
}

// =====================================================
// INSTANCIAS PREDEFINIDAS POR TIPO DE ENDPOINT
// =====================================================

/** Rate limiting para autenticación (estricto) */
export const authLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,                   // 10 intentos por ventana
  prefix: 'auth',
});

/** Rate limiting de registro: hasta 5 intentos por IP cada hora. */
export const registrationLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  prefix: 'registration',
});

/** Rate limiting para uploads (moderado) */
export const uploadLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minuto
  max: 10,              // 10 uploads por minuto
  prefix: 'upload',
});

/** Rate limiting para operaciones administrativas autenticadas. */
export const adminLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  prefix: 'admin',
});

/** Rate limiting para iniciar sesiones de pago. */
export const billingLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  prefix: 'billing',
});

/** Rate limiting para notificaciones (estricto para evitar spam) */
export const notificationLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minuto
  max: 5,               // 5 notificaciones por minuto
  prefix: 'notification',
});

/** Rate limiting para APIs generales (relajado) */
export const apiLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200,                  // 200 requests por ventana
  prefix: 'api',
});

/** Rate limiting para health check (muy estricto) */
export const healthLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minuto
  max: 30,              // 30 checks por minuto
  prefix: 'health',
});

// =====================================================
// HELPER PARA USAR EN API ROUTES
// =====================================================

/**
 * Helper para verificar rate limit en una API route.
 * Retorna una respuesta 429 si está limitado, o null si está OK.
 *
 * Uso:
 * ```typescript
 * const rateLimitResponse = await checkRateLimit(request, apiLimiter);
 * if (rateLimitResponse) return rateLimitResponse;
 * ```
 */
async function getRateLimitIdentifier(request: Request): Promise<string> {
  const forwardedFor = request.headers.get('x-forwarded-for')
    ?.split(',')
    .map(value => value.trim())
    .filter(Boolean);
  const ip = request.headers.get('x-real-ip')?.trim() ||
    forwardedFor?.[forwardedFor.length - 1] ||
    'unknown';
  const ipDigest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
  const ipHash = Array.from(new Uint8Array(ipDigest), byte => byte.toString(16).padStart(2, '0')).join('');

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return `ip:${ipHash}`;

  // Never keep a raw access token (or a truncated token prefix) as the key.
  // Hashing avoids collisions caused by the previous 20-character truncation
  // while also avoiding retention of the credential itself in the in-memory store.
  const token = authHeader.slice(7);
  try {
    const bytes = new TextEncoder().encode(token);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    return `user:${hash}`;
  } catch {
    // Fail closed on token-key generation without exposing the token.
    return `ip:${ipHash}`;
  }
}

export async function checkRateLimit(
  request: Request,
  limiter: RateLimiter
): Promise<Response | null> {
  const identifier = await getRateLimitIdentifier(request);
  const result = await limiter.check(identifier);

  if (result.limited) {
    const { NextResponse } = await import('next/server');
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Intente de nuevo más tarde.' },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((result.resetAt - Date.now()) / 1000).toString(),
          'X-RateLimit-Limit': result.total.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
        },
      }
    );
  }

  return null;
}

export { RateLimiter };
