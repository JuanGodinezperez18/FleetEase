// lib/server/firebase-admin.ts
import type { ServiceAccount } from 'firebase-admin';
import admin from 'firebase-admin';
import { logger } from '@/lib/logger';


// Verificar si ya está inicializado
if (!admin.apps.length) {
  try {
    logger.info('[Firebase Admin] Inicializando...');
    
    // Opción 1: Usar variables de entorno (RECOMENDADO para producción)
    if (process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
        } as ServiceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
      
      logger.info('[Firebase Admin] Inicializado con variables de entorno');
    } 
    // Opción 2: Fallback a serviceAccount.json (solo para desarrollo)
    else {
      const serviceAccount = require('@/../.serviceAccount.json');
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as ServiceAccount),
        storageBucket: `${serviceAccount.project_id}.appspot.com`,
      });
      
      logger.info('[Firebase Admin] Inicializado con serviceAccount.json');
    }
  } catch (error: any) {
    logger.error('[Firebase Admin] Error crítico', error as Error);
    throw error;
  }
}

// Exportar servicios
export const adminInstance = admin.apps.length > 0 ? admin.apps[0] : undefined;
export const adminDb = admin.firestore();
export const adminStorage = admin.storage();
export const adminAuth = admin.auth();

// ✅ IMPORTANTE: Exportar admin con funciones wrapper para compatibilidad
export { admin };
