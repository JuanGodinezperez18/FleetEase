/**
 * 🔍 VALIDADOR DE ÍNDICES FIRESTORE
 *
 * Este script valida que los índices críticos estén creados y funcionando.
 *
 * Uso:
 *   node scripts/validate-indexes.js
 *
 * Requisitos:
 *   - Firebase Admin SDK configurado
 *   - Variables de entorno configuradas (FIREBASE_PROJECT_ID)
 */

const admin = require('firebase-admin');

// Inicializar Firebase Admin (ajusta según tu configuración)
try {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'fleetease-manager',
  });
} catch (error) {
  console.log('⚠️  Firebase Admin ya estaba inicializado');
}

const db = admin.firestore();

// Índices críticos a validar
const CRITICAL_INDEXES = [
  {
    name: 'financialRecords (companyId + date)',
    collection: 'financialRecords',
    query: async () => {
      const testCompanyId = 'test-company-id';
      return db.collection('financialRecords')
        .where('companyId', '==', testCompanyId)
        .orderBy('date', 'desc')
        .limit(1)
        .get();
    }
  },
  {
    name: 'clients (companyId + isDeleted + createdAt)',
    collection: 'clients',
    query: async () => {
      const testCompanyId = 'test-company-id';
      return db.collection('clients')
        .where('companyId', '==', testCompanyId)
        .where('isDeleted', '==', false)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
    }
  },
  {
    name: 'vehicles (companyId + status + partnerId)',
    collection: 'vehicles',
    query: async () => {
      const testCompanyId = 'test-company-id';
      const testStatus = 'active';
      const testPartnerId = 'test-partner-id';
      return db.collection('vehicles')
        .where('companyId', '==', testCompanyId)
        .where('status', '==', testStatus)
        .where('partnerId', '==', testPartnerId)
        .limit(1)
        .get();
    }
  },
  {
    name: 'vehicles (companyId + createdAt)',
    collection: 'vehicles',
    query: async () => {
      const testCompanyId = 'test-company-id';
      return db.collection('vehicles')
        .where('companyId', '==', testCompanyId)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
    }
  },
  {
    name: 'credits (companyId + status + createdAt)',
    collection: 'credits',
    query: async () => {
      const testCompanyId = 'test-company-id';
      const testStatus = 'active';
      return db.collection('credits')
        .where('companyId', '==', testCompanyId)
        .where('status', '==', testStatus)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
    }
  }
];

async function validateIndex(index) {
  try {
    console.log(`\n🔍 Validando: ${index.name}`);
    const startTime = Date.now();

    await index.query();

    const duration = Date.now() - startTime;
    console.log(`   ✅ OK (${duration}ms)`);
    return { success: true, name: index.name, duration };
  } catch (error) {
    if (error.code === 9 || error.message.includes('index')) {
      console.log(`   ❌ FALTA ÍNDICE`);
      console.log(`   📝 Crear en: https://console.firebase.google.com`);

      // Extraer URL del índice del mensaje de error
      const urlMatch = error.message.match(/https:\/\/[^\s]+/);
      if (urlMatch) {
        console.log(`   🔗 ${urlMatch[0]}`);
      }

      return { success: false, name: index.name, error: 'Missing index' };
    } else {
      console.log(`   ⚠️  ERROR: ${error.message}`);
      return { success: false, name: index.name, error: error.message };
    }
  }
}

async function main() {
  console.log('🔥 VALIDADOR DE ÍNDICES FIRESTORE\n');
  console.log('═══════════════════════════════════\n');
  console.log(`📍 Proyecto: ${admin.instanceId().app.options.projectId}`);
  console.log(`📅 Fecha: ${new Date().toISOString()}\n`);

  console.log('Validando índices críticos...\n');

  const results = [];

  for (const index of CRITICAL_INDEXES) {
    const result = await validateIndex(index);
    results.push(result);
  }

  // Resumen
  console.log('\n═══════════════════════════════════');
  console.log('📊 RESUMEN\n');

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`✅ Índices OK: ${successful}/${CRITICAL_INDEXES.length}`);
  console.log(`❌ Índices Faltantes: ${failed}/${CRITICAL_INDEXES.length}\n`);

  if (failed > 0) {
    console.log('⚠️  ACCIÓN REQUERIDA:');
    console.log('   1. Ve a Firebase Console > Firestore > Indexes');
    console.log('   2. Crea los índices faltantes');
    console.log('   3. Espera 5-10 minutos a que se construyan');
    console.log('   4. Ejecuta este script nuevamente\n');

    console.log('   O usa Firebase CLI:');
    console.log('   firebase deploy --only firestore:indexes\n');
  } else {
    console.log('🎉 ¡TODOS LOS ÍNDICES CRÍTICOS ESTÁN LISTOS!\n');
    console.log('✅ Tu aplicación está optimizada para producción.\n');
  }

  // Velocidad promedio
  const avgDuration = results
    .filter(r => r.success && r.duration)
    .reduce((sum, r) => sum + r.duration, 0) / successful;

  if (!isNaN(avgDuration)) {
    console.log(`⚡ Velocidad promedio de queries: ${avgDuration.toFixed(0)}ms\n`);
  }

  console.log('═══════════════════════════════════\n');

  // Exit code
  process.exit(failed > 0 ? 1 : 0);
}

// Ejecutar
main().catch(error => {
  console.error('❌ Error ejecutando validación:', error);
  process.exit(1);
});
