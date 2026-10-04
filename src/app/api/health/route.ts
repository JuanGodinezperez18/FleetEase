import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { hardenAuthCookieOptions } from '@/lib/security/cookies';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { checkRateLimit, healthLimiter } from '@/lib/rate-limit';

/**
 * API Health Check para FleetEase Manager (Supabase)
 *
 * Verifica el estado de:
 * - Supabase Database (PostgreSQL)
 * - Supabase Auth
 * - Supabase Storage
 * - Variables de entorno
 *
 * @endpoint GET /api/health
 * @returns {Object} Estado de los servicios
 */

interface HealthCheck {
  name: string;
  status: 'ok' | 'degraded' | 'error';
  latency?: number;
  error?: string;
}

interface HealthResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  environment: string;
  checks: Record<string, HealthCheck>;
  uptime?: number;
}

export async function GET(request: Request) {
  // Rate limiting para health check
  const rateLimitResponse = await checkRateLimit(request, healthLimiter);
  if (rateLimitResponse) return rateLimitResponse;

  const startTime = Date.now();
  const checks: Record<string, HealthCheck> = {};
  let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

  // Verificar autenticación básica para acceso a detalles completos
  const authHeader = request.headers.get('authorization');
  const isAuthenticated = authHeader?.startsWith('Bearer ') &&
    authHeader.slice(7) === process.env.HEALTH_CHECK_SECRET;

  // Helper para crear cliente de Supabase (cookies es async en Next.js 15+)
  const createClient = async () => {
    const cookieStore = await cookies();
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...hardenAuthCookieOptions(options) });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...hardenAuthCookieOptions(options) });
          },
        },
      }
    );
  };

  // ======================
  // CHECK 1: Supabase Database
  // ======================
  try {
    const supabase = await createClient();

    const dbStart = Date.now();
    // Hacer una consulta simple a la tabla companies
    const { error } = await supabase
      .from('companies')
      .select('id')
      .limit(1);

    const dbLatency = Date.now() - dbStart;

    if (error) {
      throw error;
    }

    checks.database = {
      name: 'Supabase Database (PostgreSQL)',
      status: 'ok',
      latency: dbLatency,
    };

    if (dbLatency > 1000) {
      checks.database.status = 'degraded';
      overallStatus = 'degraded';
      logger.warn('Database latency high', { latency: dbLatency });
    }
  } catch (error) {
    checks.database = {
      name: 'Supabase Database (PostgreSQL)',
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    overallStatus = 'unhealthy';
    logger.error('Database health check failed', error);
  }

  // ======================
  // CHECK 2: Supabase Auth
  // ======================
  try {
    const supabase = await createClient();

    const authStart = Date.now();
    // Verificar que la API de auth responde
    const { error } = await supabase.auth.getSession();
    const authLatency = Date.now() - authStart;

    checks.auth = {
      name: 'Supabase Auth',
      status: error ? 'error' : 'ok',
      latency: authLatency,
    };

    if (error) {
      checks.auth.error = error.message;
      if (overallStatus === 'healthy') {
        overallStatus = 'degraded';
      }
      logger.error('Auth health check failed', error);
    }
  } catch (error) {
    checks.auth = {
      name: 'Supabase Auth',
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    if (overallStatus === 'healthy') {
      overallStatus = 'degraded';
    }
    logger.error('Auth health check failed', error);
  }

  // ======================
  // CHECK 3: Supabase Storage
  // ======================
  try {
    const supabase = await createClient();

    const storageStart = Date.now();
    // Listar buckets para verificar que storage funciona
    const { error } = await supabase.storage.listBuckets();
    const storageLatency = Date.now() - storageStart;

    checks.storage = {
      name: 'Supabase Storage',
      status: error ? 'error' : 'ok',
      latency: storageLatency,
    };

    if (error) {
      checks.storage.error = error.message;
      if (overallStatus === 'healthy') {
        overallStatus = 'degraded';
      }
      logger.error('Storage health check failed', error);
    }
  } catch (error) {
    checks.storage = {
      name: 'Supabase Storage',
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    if (overallStatus === 'healthy') {
      overallStatus = 'degraded';
    }
    logger.error('Storage health check failed', error);
  }

  // ======================
  // CHECK 4: Variables de Entorno Críticas (solo nombres, no valores)
  // ======================
  try {
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ];

    const missingVars = requiredVars.filter(
      (varName) => !process.env[varName]
    );

    checks.environment = {
      name: 'Environment Variables',
      status: missingVars.length === 0 ? 'ok' : 'error',
    };

    if (missingVars.length > 0) {
      checks.environment.error = `Missing: ${missingVars.length} required variables`;
      overallStatus = 'unhealthy';
      logger.error('Missing required environment variables', { missingVars });
    }
  } catch (error) {
    checks.environment = {
      name: 'Environment Variables',
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    overallStatus = 'unhealthy';
  }

  // ======================
  // CHECK 5: Memoria del Servidor (solo para usuarios autenticados)
  // ======================
  if (isAuthenticated) {
    try {
      if (typeof process !== 'undefined' && process.memoryUsage) {
        const memoryUsage = process.memoryUsage();
        const usagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

        checks.memory = {
          name: 'Server Memory',
          status: usagePercent < 80 ? 'ok' : 'degraded',
          latency: 0,
        };

        if (usagePercent >= 80) {
          logger.warn('High memory usage detected');
          if (overallStatus === 'healthy') {
            overallStatus = 'degraded';
          }
        }
      }
    } catch (error) {
      // Memory check is optional, no need to fail if unavailable
    }
  }

  // ======================
  // BUILD RESPONSE
  // ======================
  const totalLatency = Date.now() - startTime;

  // Para solicitudes no autenticadas, solo devolver estado básico
  if (!isAuthenticated) {
    logger.info('Health check completed (unauthenticated)', {
      status: overallStatus,
    });

    return NextResponse.json(
      { status: overallStatus, timestamp: new Date().toISOString() },
      {
        status: overallStatus === 'unhealthy' ? 503 : 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }

  const response: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks,
    uptime: process.uptime ? Math.round(process.uptime()) : undefined,
  };

  // ======================
  // LOGGING
  // ======================
  logger.info('Health check completed', {
    status: overallStatus,
    latency: totalLatency,
    checks: Object.keys(checks),
  });

  // ======================
  // RETURN RESPONSE
  // ======================
  const statusCode =
    overallStatus === 'healthy' ? 200 :
    overallStatus === 'degraded' ? 200 : 503;

  return NextResponse.json(response, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'X-Response-Time': `${totalLatency}ms`,
    },
  });
}
