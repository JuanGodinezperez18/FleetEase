/**
 * @fileoverview Script de migración de Firebase a Supabase (Versión Simplificada)
 * 
 * Este script exporta datos de Firebase/Firestore y los importa a Supabase/PostgreSQL
 * 
 * Uso:
 *   npx tsx scripts/migrate-to-supabase-simple.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Cargar variables de entorno desde .env y .env.local
function loadEnvFile(filePath: string) {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          process.env[key.trim()] = value;
        }
      }
    });
  }
}

// Cargar .env.local y .env
loadEnvFile(path.join(process.cwd(), '.env.local'));
loadEnvFile(path.join(process.cwd(), '.env'));

import * as admin from 'firebase-admin';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// =====================================================
// CONFIGURACIÓN
// =====================================================

// Inicializar Firebase Admin
const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!firebaseAdminConfig.projectId || !firebaseAdminConfig.clientEmail || !firebaseAdminConfig.privateKey) {
  console.warn('⚠️ [MIGRATION] Firebase Admin credentials not found. Skipping Firebase initialization.');
} else {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: firebaseAdminConfig.projectId,
        clientEmail: firebaseAdminConfig.clientEmail,
        privateKey: firebaseAdminConfig.privateKey,
      }),
    });
    console.log('✅ [MIGRATION] Firebase Admin initialized');
  } catch (error) {
    console.error('❌ [MIGRATION] Firebase Admin initialization failed:', error);
  }
}

// Inicializar Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ [MIGRATION] Supabase credentials not found.');
  process.exit(1);
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);
console.log('✅ [MIGRATION] Supabase initialized');

// =====================================================
// MAPEO DE COLECCIONES A TABLAS
// =====================================================

const collectionToTableMap: Record<string, string> = {
  'clients': 'clients',
  'vehicles': 'vehicles',
  'mileageLogs': 'mileage_logs',
  'financialRecords': 'financial_records',
  'partners': 'partners',
  'users': 'users',
  'credits': 'credits',
  'notifications': 'notifications',
  'vehicleAssignmentLogs': 'vehicle_assignment_logs',
  'companies': 'companies',
  'financialCategories': 'financial_categories',
  'companyChangeLogs': 'company_change_logs',
  'clientChangeLogs': 'client_change_logs',
  'messageTemplates': 'message_templates',
  'messageLogs': 'message_logs',
  'creditPaymentSchedules': 'credit_payment_schedules',
  'multas': 'multas',
  'fcmTokens': 'fcm_tokens',
  'auditLogs': 'audit_logs',
  'documents': 'documents',
  'gpsConfigs': 'gps_configs',
  'seguimientos': 'seguimientos',
};

// =====================================================
// TRANSFORMADORES DE DATOS SIMPLIFICADOS
// =====================================================

/**
 * Transformar nombre de campo de camelCase a snake_case
 */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Transformar valor de Firestore a PostgreSQL
 */
function transformValue(value: any): any {
  if (value === null || value === undefined) {
    return null;
  }

  // Firestore Timestamp -> ISO String
  if (value?._seconds !== undefined) {
    return new Date(value._seconds * 1000).toISOString();
  }

  // Firestore GeoPoint -> objeto con lat/lng
  if (value?.latitude !== undefined && value?.longitude !== undefined) {
    return { latitude: value.latitude, longitude: value.longitude };
  }

  // Firestore DocumentReference -> ID
  if (value?.path !== undefined && typeof value.path === 'string') {
    return value.path.split('/').pop();
  }

  // Arrays
  if (Array.isArray(value)) {
    return value.map(transformValue);
  }

  // Objetos
  if (typeof value === 'object' && !(value instanceof Date)) {
    const transformed: any = {};
    for (const [key, val] of Object.entries(value)) {
      transformed[camelToSnake(key)] = transformValue(val);
    }
    return transformed;
  }

  return value;
}

/**
 * Transformar documento de Firestore a formato PostgreSQL
 * Esta versión NO valida columnas - importa todo lo que existe
 */
function transformDocument(doc: any, collectionName: string): any {
  const data = doc.data ? doc.data() : doc;
  const id = doc.id;

  const transformed: any = { id };

  for (const [key, value] of Object.entries(data)) {
    const snakeKey = camelToSnake(key);
    // Importar TODOS los campos sin validar
    transformed[snakeKey] = transformValue(value);
  }

  return transformed;
}

// =====================================================
// FUNCIONES DE MIGRACIÓN
// =====================================================

/**
 * Exportar datos de Firestore
 */
async function exportFromFirestore(collectionName: string): Promise<any[]> {
  try {
    const db = admin.firestore();
    const snapshot = await db.collection(collectionName).get();

    if (snapshot.empty) {
      console.log(`  ⚪ [EXPORT] No documents found in ${collectionName}`);
      return [];
    }

    const documents = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log(`  ✅ [EXPORT] Exported ${documents.length} documents from ${collectionName}`);
    return documents;
  } catch (error) {
    console.error(`  ❌ [EXPORT] Error exporting ${collectionName}:`, error);
    return [];
  }
}

/**
 * Importar datos a Supabase
 */
async function importToSupabase(tableName: string, documents: any[]): Promise<boolean> {
  if (documents.length === 0) {
    return true;
  }

  try {
    // Insertar en lotes de 100
    const batchSize = 100;
    const batches = Math.ceil(documents.length / batchSize);

    for (let i = 0; i < batches; i++) {
      const batch = documents.slice(i * batchSize, (i + 1) * batchSize);
      
      const { error } = await supabase
        .from(tableName)
        .upsert(batch, { onConflict: 'id' })
        .select();

      if (error) {
        console.error(`  ❌ [IMPORT] Error importing to ${tableName}:`, error);
        return false;
      }

      console.log(`  📦 [IMPORT] Imported batch ${i + 1}/${batches} to ${tableName}`);
    }

    console.log(`  ✅ [IMPORT] Successfully imported ${documents.length} records to ${tableName}`);
    return true;
  } catch (error) {
    console.error(`  ❌ [IMPORT] Error importing to ${tableName}:`, error);
    return false;
  }
}

/**
 * Migrar una colección específica
 */
async function migrateCollection(collectionName: string): Promise<boolean> {
  const tableName = collectionToTableMap[collectionName];

  if (!tableName) {
    console.log(`  ⚪ [SKIP] No table mapping for ${collectionName}`);
    return false;
  }

  console.log(`\n🔄 Migrating: ${collectionName} -> ${tableName}`);

  // Exportar desde Firestore
  const documents = await exportFromFirestore(collectionName);

  if (documents.length === 0) {
    return true;
  }

  // Transformar documentos
  const transformedDocs = documents.map(doc => transformDocument(doc, collectionName));

  // Importar a Supabase
  const success = await importToSupabase(tableName, transformedDocs);

  return success;
}

// =====================================================
// MIGRACIÓN COMPLETA
// =====================================================

async function migrateAll() {
  console.log('\n🚀 Starting full migration from Firebase to Supabase\n');
  console.log('='.repeat(60));

  const results: Record<string, boolean> = {};

  for (const [collection, table] of Object.entries(collectionToTableMap)) {
    try {
      results[collection] = await migrateCollection(collection);
    } catch (error) {
      console.error(`❌ Migration failed for ${collection}:`, error);
      results[collection] = false;
    }
  }

  // Resumen
  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary\n');

  const successful = Object.values(results).filter(r => r).length;
  const total = Object.values(results).length;

  console.log(`✅ Successful: ${successful}/${total}`);
  
  for (const [collection, success] of Object.entries(results)) {
    const icon = success ? '✅' : '❌';
    console.log(`  ${icon} ${collection}`);
  }

  if (successful === total) {
    console.log('\n🎉 Migration completed successfully!\n');
  } else {
    console.log('\n⚠️  Migration completed with errors. Please check the logs above.\n');
  }
}

// =====================================================
// MIGRACIÓN SELECTIVA
// =====================================================

async function migrateSelective(collections: string[]) {
  console.log('\n🚀 Starting selective migration\n');
  console.log('='.repeat(60));
  console.log(`Collections to migrate: ${collections.join(', ')}`);
  console.log('='.repeat(60));

  for (const collection of collections) {
    if (collectionToTableMap[collection]) {
      await migrateCollection(collection);
    } else {
      console.log(`  ⚪ [SKIP] No table mapping for ${collection}`);
    }
  }
}

// =====================================================
// MAIN
// =====================================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'migrate':
      if (args[1]) {
        const collections = args[1].split(',');
        await migrateSelective(collections);
      } else {
        await migrateAll();
      }
      break;

    case 'help':
    default:
      console.log(`
📦 Firebase to Supabase Migration Tool (Simple Version)

Usage:
  npx tsx scripts/migrate-to-supabase-simple.ts <command> [options]

Commands:
  migrate           Migrate all collections
  migrate <cols>    Migrate specific collections (comma-separated)
  help              Show this help message

Examples:
  npx tsx scripts/migrate-to-supabase-simple.ts migrate
  npx tsx scripts/migrate-to-supabase-simple.ts migrate clients,vehicles

Notes:
  - This is a simplified version without strict validation
  - Make sure .env.local is configured with Firebase and Supabase credentials
  - Migration uses upsert, so it's safe to run multiple times
      `);
      break;
  }
}

// Ejecutar
main().catch(console.error);
