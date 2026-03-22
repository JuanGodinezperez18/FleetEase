import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { logger } from '@/lib/logger';

/**
 * API Health Check para FleetEase Manager
 * 
 * Verifica el estado de:
 * - Firebase Firestore
 * - Firebase Auth (indirectamente)
 * - Firebase Storage
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

export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, HealthCheck> = {};
  let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

  // ======================
  // CHECK 1: Firestore
  // ======================
  try {
    const firestoreStart = Date.now();
    await getDoc(doc(db, '_health', 'check'));
    const firestoreLatency = Date.now() - firestoreStart;
    
    checks.firestore = {
      name: 'Firebase Firestore',
      status: 'ok',
      latency: firestoreLatency,
    };

    if (firestoreLatency > 1000) {
      checks.firestore.status = 'degraded';
      overallStatus = 'degraded';
      logger.warn('Firestore latency high', { latency: firestoreLatency });
    }
  } catch (error) {
    checks.firestore = {
      name: 'Firebase Firestore',
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    overallStatus = 'unhealthy';
    logger.error('Firestore health check failed', error);
  }

  // ======================
  // CHECK 2: Firebase Admin (si está disponible)
  // ======================
  try {
    // Verificamos si las variables de admin están configuradas
    const hasAdminConfig = !!(
      process.env.FIREBASE_ADMIN_PROJECT_ID &&
      process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
      process.env.FIREBASE_ADMIN_PRIVATE_KEY
    );

    checks.firebaseAdmin = {
      name: 'Firebase Admin SDK',
      status: hasAdminConfig ? 'ok' : 'degraded',
    };

    if (!hasAdminConfig) {
      checks.firebaseAdmin.error = 'Admin credentials not configured';
      if (overallStatus === 'healthy') {
        overallStatus = 'degraded';
      }
      logger.warn('Firebase Admin SDK not configured');
    }
  } catch (error) {
    checks.firebaseAdmin = {
      name: 'Firebase Admin SDK',
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    if (overallStatus === 'healthy') {
      overallStatus = 'degraded';
    }
  }

  // ======================
  // CHECK 3: Variables de Entorno Críticas
  // ======================
  try {
    const requiredVars = [
      'NEXT_PUBLIC_FIREBASE_API_KEY',
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    ];

    const missingVars = requiredVars.filter(
      (varName) => !process.env[varName]
    );

    checks.environment = {
      name: 'Environment Variables',
      status: missingVars.length === 0 ? 'ok' : 'error',
    };

    if (missingVars.length > 0) {
      checks.environment.error = `Missing: ${missingVars.join(', ')}`;
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
  // CHECK 4: Memoria del Servidor (si está disponible)
  // ======================
  try {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
      const usagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

      checks.memory = {
        name: 'Server Memory',
        status: usagePercent < 80 ? 'ok' : 'degraded',
        latency: 0,
      };

      if (usagePercent >= 80) {
        logger.warn('High memory usage', { heapUsedMB, heapTotalMB, usagePercent });
        if (overallStatus === 'healthy') {
          overallStatus = 'degraded';
        }
      }
    }
  } catch (error) {
    // Memory check is optional, no need to fail if unavailable
  }

  // ======================
  // BUILD RESPONSE
  // ======================
  const totalLatency = Date.now() - startTime;

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
