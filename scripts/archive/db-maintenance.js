#!/usr/bin/env node

/**
 * @fileoverview Script de Mantenimiento de Base de Datos para FleetEase Manager
 * 
 * Funciones:
 * - Limpieza de documentos soft-deleted antiguos
 * - Limpieza de logs expirados
 * - Optimización de índices
 * - Backup de datos críticos
 * 
 * Uso:
 *   node scripts/db-maintenance.js [command]
 * 
 * Comandos:
 *   clean-soft-deleted  - Elimina documentos marcados como isDeleted hace más de 90 días
 *   clean-logs          - Limpia logs antiguos (más de 1 año)
 *   clean-temp          - Elimina datos temporales
 *   backup              - Crea backup de colecciones críticas
 *   all                 - Ejecuta todo el mantenimiento
 * 
 * Ejemplos:
 *   node scripts/db-maintenance.js clean-soft-deleted
 *   node scripts/db-maintenance.js all
 */

const admin = require('firebase-admin');
const { format } = require('date-fns');
const fs = require('fs');
const path = require('path');

// ======================
// CONFIGURACIÓN
// ======================

const CONFIG = {
  // Días para mantener documentos soft-deleted
  SOFT_DELETE_DAYS: 90,
  
  // Días para mantener logs
  LOG_RETENTION_DAYS: 365,
  
  // Límite de documentos por batch
  BATCH_SIZE: 500,
  
  // Pausa entre batches (ms)
  BATCH_DELAY: 100,
  
  // Colecciones a limpiar
  COLLECTIONS: {
    SOFT_DELETED: [
      'clients',
      'vehicles',
      'partners',
      'credits',
      'financialRecords',
      'notifications',
      'mileageLogs',
      'vehicleInspections',
      'multas',
    ],
    LOGS: [
      'auditLogs',
      'clientChangeLogs',
      'companyChangeLogs',
      'userAuditLogs',
      'messageLogs',
    ],
    BACKUP: [
      'users',
      'companies',
      'clients',
      'vehicles',
      'partners',
      'credits',
    ],
  },
};

// ======================
// INICIALIZACIÓN
// ======================

function initializeFirebase() {
  try {
    // Intentar cargar service account desde archivo
    const serviceAccountPath = path.join(__dirname, '../.serviceAccount.json');
    
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      
      console.log('✅ Firebase Admin inicializado con serviceAccount.json');
    } else if (process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
      // Usar variables de entorno
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
      
      console.log('✅ Firebase Admin inicializado con variables de entorno');
    } else {
      console.error('❌ Error: No se encontró configuración de Firebase Admin');
      console.error('   Opciones:');
      console.error('   1. Crear archivo .serviceAccount.json en la raíz');
      console.error('   2. Configurar variables de entorno FIREBASE_ADMIN_*');
      process.exit(1);
    }
    
    return admin.firestore();
  } catch (error) {
    console.error('❌ Error inicializando Firebase Admin:', error.message);
    process.exit(1);
  }
}

// ======================
// FUNCIONES DE MANTENIMIENTO
// ======================

/**
 * Limpia documentos soft-deleted antiguos
 */
async function cleanSoftDeleted(db) {
  console.log('\n🧹 Limpiando documentos soft-deleted antiguos...');
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - CONFIG.SOFT_DELETE_DAYS);
  
  let totalDeleted = 0;
  
  for (const collectionName of CONFIG.COLLECTIONS.SOFT_DELETED) {
    try {
      console.log(`\n📁 Colección: ${collectionName}`);
      
      let deletedCount = 0;
      let lastDoc = null;
      let hasMore = true;
      
      while (hasMore) {
        let query = db.collection(collectionName)
          .where('isDeleted', '==', true)
          .where('updatedAt', '<', cutoffDate.toISOString())
          .limit(CONFIG.BATCH_SIZE);
        
        if (lastDoc) {
          query = query.startAfter(lastDoc);
        }
        
        const snapshot = await query.get();
        
        if (snapshot.empty) {
          hasMore = false;
          break;
        }
        
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
          deletedCount++;
        });
        
        await batch.commit();
        lastDoc = snapshot.docs[snapshot.docs.length - 1];
        hasMore = snapshot.docs.length === CONFIG.BATCH_SIZE;
        
        console.log(`   ⏳ Eliminados ${deletedCount} documentos...`);
        
        // Pausa para evitar rate limiting
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, CONFIG.BATCH_DELAY));
        }
      }
      
      console.log(`   ✅ ${collectionName}: ${deletedCount} documentos eliminados`);
      totalDeleted += deletedCount;
      
    } catch (error) {
      console.error(`   ⚠️ Error en ${collectionName}:`, error.message);
    }
  }
  
  console.log(`\n✅ Total soft-deleted eliminados: ${totalDeleted}`);
  return totalDeleted;
}

/**
 * Limpia logs antiguos
 */
async function cleanLogs(db) {
  console.log('\n🧹 Limpiando logs antiguos...');
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - CONFIG.LOG_RETENTION_DAYS);
  
  let totalDeleted = 0;
  
  for (const collectionName of CONFIG.COLLECTIONS.LOGS) {
    try {
      console.log(`\n📁 Colección: ${collectionName}`);
      
      let deletedCount = 0;
      let lastDoc = null;
      let hasMore = true;
      
      while (hasMore) {
        let query = db.collection(collectionName)
          .orderBy('timestamp', 'desc')
          .limit(CONFIG.BATCH_SIZE);
        
        if (lastDoc) {
          query = query.startAfter(lastDoc);
        }
        
        const snapshot = await query.get();
        
        if (snapshot.empty) {
          hasMore = false;
          break;
        }
        
        // Filtrar documentos antiguos en el cliente
        const oldDocs = snapshot.docs.filter(doc => {
          const data = doc.data();
          const docDate = data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
          return docDate < cutoffDate;
        });
        
        if (oldDocs.length === 0) {
          hasMore = false;
          break;
        }
        
        const batch = db.batch();
        oldDocs.forEach(doc => {
          batch.delete(doc.ref);
          deletedCount++;
        });
        
        await batch.commit();
        lastDoc = snapshot.docs[snapshot.docs.length - 1];
        hasMore = snapshot.docs.length === CONFIG.BATCH_SIZE;
        
        console.log(`   ⏳ Eliminados ${deletedCount} documentos...`);
        
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, CONFIG.BATCH_DELAY));
        }
      }
      
      console.log(`   ✅ ${collectionName}: ${deletedCount} logs eliminados`);
      totalDeleted += deletedCount;
      
    } catch (error) {
      console.error(`   ⚠️ Error en ${collectionName}:`, error.message);
    }
  }
  
  console.log(`\n✅ Total logs eliminados: ${totalDeleted}`);
  return totalDeleted;
}

/**
 * Crea backup de colecciones críticas
 */
async function createBackup(db) {
  console.log('\n💾 Creando backup de colecciones críticas...');
  
  const backupDir = path.join(__dirname, '../backups');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
  let totalBackedUp = 0;
  
  for (const collectionName of CONFIG.COLLECTIONS.BACKUP) {
    try {
      console.log(`\n📁 Colección: ${collectionName}`);
      
      const documents = [];
      let lastDoc = null;
      let hasMore = true;
      
      while (hasMore) {
        let query = db.collection(collectionName).limit(CONFIG.BATCH_SIZE);
        
        if (lastDoc) {
          query = query.startAfter(lastDoc);
        }
        
        const snapshot = await query.get();
        
        if (snapshot.empty) {
          hasMore = false;
          break;
        }
        
        snapshot.docs.forEach(doc => {
          documents.push({
            id: doc.id,
            ...doc.data(),
          });
        });
        
        lastDoc = snapshot.docs[snapshot.docs.length - 1];
        hasMore = snapshot.docs.length === CONFIG.BATCH_SIZE;
        
        console.log(`   ⏳ ${documents.length} documentos cargados...`);
        
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, CONFIG.BATCH_DELAY));
        }
      }
      
      // Guardar backup
      const backupFile = path.join(backupDir, `${collectionName}_${timestamp}.json`);
      fs.writeFileSync(backupFile, JSON.stringify(documents, null, 2));
      
      console.log(`   ✅ ${collectionName}: ${documents.length} documentos (${(fs.statSync(backupFile).size / 1024).toFixed(2)} KB)`);
      totalBackedUp += documents.length;
      
    } catch (error) {
      console.error(`   ⚠️ Error en ${collectionName}:`, error.message);
    }
  }
  
  console.log(`\n✅ Total documentos en backup: ${totalBackedUp}`);
  console.log(`📂 Backups guardados en: ${backupDir}`);
  
  // Limpiar backups antiguos (más de 30 días)
  cleanupOldBackups(backupDir);
  
  return totalBackedUp;
}

/**
 * Limpia backups antiguos
 */
function cleanupOldBackups(backupDir) {
  console.log('\n🧹 Limpiando backups antiguos...');
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 30);
  
  let deletedCount = 0;
  
  try {
    const files = fs.readdirSync(backupDir);
    
    for (const file of files) {
      const filePath = path.join(backupDir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.mtime < cutoffDate) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    }
    
    console.log(`   ✅ ${deletedCount} backups antiguos eliminados`);
  } catch (error) {
    console.error('   ⚠️ Error limpiando backups:', error.message);
  }
}

/**
 * Muestra estadísticas de la base de datos
 */
async function showStats(db) {
  console.log('\n📊 Estadísticas de la Base de Datos:\n');
  
  const allCollections = [
    ...CONFIG.COLLECTIONS.SOFT_DELETED,
    ...CONFIG.COLLECTIONS.LOGS,
    ...CONFIG.COLLECTIONS.BACKUP,
    'users',
    'companies',
    'financialCategories',
    'messageTemplates',
  ];
  
  const uniqueCollections = [...new Set(allCollections)];
  
  for (const collectionName of uniqueCollections) {
    try {
      const snapshot = await db.collection(collectionName).count().get();
      const count = snapshot.data().count;
      
      if (count > 0) {
        console.log(`   📁 ${collectionName}: ${count.toLocaleString()} documentos`);
      }
    } catch (error) {
      // Colección puede no existir
    }
  }
}

// ======================
// MAIN
// ======================

async function main() {
  const command = process.argv[2] || 'all';
  
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   FleetEase Manager - DB Maintenance Script            ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`\n⏰ Inicio: ${new Date().toISOString()}`);
  console.log(`🔧 Comando: ${command}`);
  
  const db = initializeFirebase();
  
  // Mostrar estadísticas iniciales
  await showStats(db);
  
  const startTime = Date.now();
  
  switch (command) {
    case 'clean-soft-deleted':
      await cleanSoftDeleted(db);
      break;
      
    case 'clean-logs':
      await cleanLogs(db);
      break;
      
    case 'clean-temp':
      console.log('\n🧹 Limpieza de datos temporales...');
      console.log('   ⚠️ Función no implementada aún');
      break;
      
    case 'backup':
      await createBackup(db);
      break;
      
    case 'all':
      console.log('\n🚀 Ejecutando mantenimiento completo...\n');
      await cleanSoftDeleted(db);
      await cleanLogs(db);
      await createBackup(db);
      break;
      
    default:
      console.log('\n❌ Comando no reconocido');
      console.log('\nComandos disponibles:');
      console.log('  clean-soft-deleted  - Elimina documentos soft-deleted antiguos');
      console.log('  clean-logs          - Limpia logs antiguos');
      console.log('  clean-temp          - Elimina datos temporales');
      console.log('  backup              - Crea backup de colecciones críticas');
      console.log('  all                 - Ejecuta todo el mantenimiento');
      process.exit(1);
  }
  
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log(`║   Mantenimiento completado en ${totalTime}s`.padEnd(57) + '║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`\n⏰ Fin: ${new Date().toISOString()}`);
  
  process.exit(0);
}

// Ejecutar
main().catch(error => {
  console.error('\n❌ Error fatal:', error);
  process.exit(1);
});
