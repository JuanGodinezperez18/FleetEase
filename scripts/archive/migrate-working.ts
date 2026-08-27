/**
 * Script de migración FUNCIONAL de Firebase a Supabase
 * Uso: npx tsx scripts/migrate-working.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Cargar variables de entorno
function loadEnvFile(filePath: string) {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          process.env[key.trim()] = value;
        }
      }
    });
  }
}

loadEnvFile(path.join(process.cwd(), '.env.local'));

import * as admin from 'firebase-admin';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// =====================================================
// CONFIGURACIÓN
// =====================================================

const firebaseConfig = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!firebaseConfig.projectId || !firebaseConfig.clientEmail || !firebaseConfig.privateKey) {
  console.error('❌ Faltan credenciales de Firebase Admin');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(firebaseConfig as any),
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

console.log('✅ Firebase y Supabase inicializados\n');

// =====================================================
// UTILIDADES UUID
// =====================================================

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function isValidUUID(str: string): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// =====================================================
// CONFIGURACIÓN DE MIGRACIÓN
// =====================================================

const collectionToTable: Record<string, string> = {
  'companies': 'companies',
  'users': 'users',
  'financialCategories': 'financial_categories',
  'partners': 'partners',
  'clients': 'clients',
  'vehicles': 'vehicles',
  'mileageLogs': 'mileage_logs',
  'financialRecords': 'financial_records',
  'credits': 'credits',
  'creditPaymentSchedules': 'credit_payment_schedules',
  'notifications': 'notifications',
  'vehicleAssignmentLogs': 'vehicle_assignment_logs',
  'companyChangeLogs': 'company_change_logs',
  'clientChangeLogs': 'client_change_logs',
  'messageTemplates': 'message_templates',
  'messageLogs': 'message_logs',
  'multas': 'multas',
  'fcmTokens': 'fcm_tokens',
  'auditLogs': 'audit_logs',
  'documents': 'documents',
  'gpsConfigs': 'gps_configs',
  'seguimientos': 'seguimientos',
};

const migrationOrder = [
  'companies',
  'users',
  'financialCategories',
  'partners',
  'clients',
  'vehicles',
  'credits',
  'creditPaymentSchedules',
  'mileageLogs',
  'financialRecords',
  'notifications',
  'vehicleAssignmentLogs',
  'companyChangeLogs',
  'clientChangeLogs',
  'messageTemplates',
  'messageLogs',
  'multas',
  'fcmTokens',
  'auditLogs',
  'documents',
  'gpsConfigs',
  'seguimientos',
];

const validColumns: Record<string, string[]> = {
  companies: ['id', 'name', 'email', 'phone', 'street', 'city', 'state', 'zip_code', 'country', 'is_deleted', 'created_at', 'updated_at'],
  users: ['id', 'email', 'name', 'phone', 'street', 'city', 'state', 'zip_code', 'country', 'role', 'company_id', 'is_deleted', 'created_at', 'updated_at'],
  clients: ['id', 'user_id', 'firstname', 'lastname', 'email', 'phone', 'street', 'city', 'state', 'zip_code', 'country', 'status', 'is_deleted', 'created_at', 'updated_at', 'company_id', 'balance', 'license_number'],
  partners: ['id', 'user_id', 'firstname', 'lastname', 'name', 'email', 'phone', 'street', 'city', 'state', 'zip_code', 'country', 'balance', 'is_deleted', 'created_at', 'updated_at', 'company_id'],
  vehicles: ['id', 'alias', 'make', 'model', 'year', 'plate', 'serial_number', 'color', 'status', 'client_id', 'partner_id', 'cost', 'weekly_rental_value', 'is_deleted', 'created_at', 'updated_at', 'company_id'],
  financial_categories: ['id', 'name', 'type', 'affects', 'description', 'is_default', 'company_id', 'category'],
  mileage_logs: ['id', 'uid', 'vehicle_id', 'mileage', 'date', 'notes', 'created_at', 'company_id', 'is_deleted'],
  financial_records: ['id', 'company_id', 'client_id', 'vehicle_id', 'category', 'type', 'amount', 'description', 'date', 'is_deleted', 'created_at'],
  credits: ['id', 'uid', 'client_id', 'vehicle_id', 'total_amount', 'paid_amount', 'remaining_balance', 'weekly_payment', 'number_of_payments', 'payments_made', 'start_date', 'status', 'is_deleted', 'created_at', 'company_id'],
  notifications: ['id', 'uid', 'type', 'message', 'date', 'is_read', 'company_id'],
};

// =====================================================
// MIGRACIÓN
// =====================================================

// ID Mapping global que persiste durante toda la ejecución
const idMapping: Map<string, string> = new Map();

function getUUID(collection: string, oldId: string): string | null {
  if (!oldId) return null;
  const key = `${collection}:${oldId}`;
  if (!idMapping.has(key)) {
    idMapping.set(key, isValidUUID(oldId) ? oldId : generateUUID());
  }
  return idMapping.get(key) || null;
}

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Parsea fechas en formato DD/MM/YYYY a ISO
 */
function parseDate(value: any): string | null {
  if (!value) return null;
  
  // Si es string con formato DD/MM/YYYY
  if (typeof value === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [day, month, year] = value.split('/');
    const date = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  
  return null;
}

/**
 * Verifica si un documento está eliminado lógicamente
 */
function isDocumentDeleted(doc: any): boolean {
  return doc.is_deleted === true || 
         doc.isDeleted === true || 
         doc.deleted === true;
}

/**
 * Desactiva RLS para una tabla temporalmente
 */
async function disableRLSForTable(table: string): Promise<void> {
  try {
    await supabase.rpc('disable_rls_for_table', { table_name: table });
  } catch (error) {
    // Si no existe la función, intentamos con SQL directo
    console.log(`  ⚠️ No se pudo desactivar RLS para ${table} (puede que no sea necesario)`);
  }
}

/**
 * Desactiva todas las foreign key constraints temporalmente
 * Nota: Requiere ejecutar SQL manual en Supabase SQL Editor
 */
async function disableForeignKeys(): Promise<void> {
  console.log('\n⚠️ IMPORTANTE: Las foreign key constraints deben desactivarse manualmente');
  console.log('Ejecuta este SQL en Supabase SQL Editor antes de continuar:\n');
  console.log('ALTER TABLE users DISABLE TRIGGER ALL;');
  console.log('ALTER TABLE vehicles DISABLE TRIGGER ALL;');
  console.log('ALTER TABLE credits DISABLE TRIGGER ALL;');
  console.log('ALTER TABLE mileage_logs DISABLE TRIGGER ALL;');
  console.log('ALTER TABLE financial_records DISABLE TRIGGER ALL;\n');
  console.log('Continuando con la migración...\n');
}

/**
 * Reactiva todas las foreign key constraints
 */
async function enableForeignKeys(): Promise<void> {
  console.log('\n⚠️ IMPORTANTE: Reactiva las foreign key constraints manualmente');
  console.log('Ejecuta este SQL en Supabase SQL Editor después de la migración:\n');
  console.log('ALTER TABLE users ENABLE TRIGGER ALL;');
  console.log('ALTER TABLE vehicles ENABLE TRIGGER ALL;');
  console.log('ALTER TABLE credits ENABLE TRIGGER ALL;');
  console.log('ALTER TABLE mileage_logs ENABLE TRIGGER ALL;');
  console.log('ALTER TABLE financial_records ENABLE TRIGGER ALL;\n');
}

async function migrateCollection(collection: string, skipExisting: boolean = true) {
  const table = collectionToTable[collection];
  if (!table) return { exported: 0, imported: 0, errors: 0 };

  console.log(`\n🔄 Migrando: ${collection} → ${table}`);

  try {
    const db = admin.firestore();
    const snapshot = await db.collection(collection).get();

    if (snapshot.empty) {
      console.log(`  ⚪ Sin documentos`);
      return { exported: 0, imported: 0, errors: 0 };
    }

    const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`  📦 ${docs.length} documentos`);

    let imported = 0;
    let errors = 0;
    let skippedDeleted = 0;
    let skippedExisting = 0;

    for (const doc of docs) {
      try {
        // Saltar documentos eliminados lógicamente
        if (isDocumentDeleted(doc)) {
          console.log(`  ⏭️ Saltando (eliminado): ${doc.id}`);
          skippedDeleted++;
          continue;
        }

        // Transformar ID
        const newId = getUUID(collection, doc.id);
        if (!newId || newId === '') {
          console.log(`  ⚠️ ID vacío o inválido para ${doc.id}, saltando`);
          errors++;
          continue;
        }

        // Transformar documento
        const transformed: any = { id: newId };
        const allowedColumns = validColumns[table] || [];

        for (const [key, value] of Object.entries(doc)) {
          if (key === 'id') continue; // Ya lo procesamos
          if (value === null || value === undefined) continue;

          const snakeKey = camelToSnake(key);
          if (!allowedColumns.includes(snakeKey)) continue;

          // Timestamp de Firestore
          const rawValue = value as any;
          if (rawValue?._seconds !== undefined) {
            transformed[snakeKey] = new Date(rawValue._seconds * 1000).toISOString();
          }
          // Referencia de Firestore
          else if (rawValue?.path !== undefined && typeof rawValue.path === 'string') {
            const parts = rawValue.path.split('/');
            const refCollection = parts[0];
            const refId = parts.pop() || '';
            if (refId) {
              transformed[snakeKey] = getUUID(refCollection, refId);
            } else {
              transformed[snakeKey] = null;
            }
          }
          // Campos que terminan en _id (IDs de referencia)
          else if (snakeKey.endsWith('_id') && typeof value === 'string' && value.length > 0) {
            const targetCollection = snakeKey === 'company_id' ? 'companies' :
                                    snakeKey === 'client_id' ? 'clients' :
                                    snakeKey === 'vehicle_id' ? 'vehicles' :
                                    snakeKey === 'user_id' || snakeKey === 'uid' ? 'users' :
                                    snakeKey === 'partner_id' ? 'partners' :
                                    snakeKey === 'credit_id' ? 'credits' :
                                    collection;
            transformed[snakeKey] = getUUID(targetCollection, value);
          }
          // Campos de fecha en formato DD/MM/YYYY
          else if (snakeKey.includes('date') || snakeKey.includes('fecha')) {
            const parsedDate = parseDate(value);
            if (parsedDate) {
              transformed[snakeKey] = parsedDate;
            } else if (typeof value === 'string') {
              // Intentar parsear como fecha genérica
              const date = new Date(value);
              if (!isNaN(date.getTime())) {
                transformed[snakeKey] = date.toISOString();
              } else {
                transformed[snakeKey] = new Date().toISOString();
              }
            }
          }
          // Otros valores
          else {
            transformed[snakeKey] = value;
          }
        }

        // Valores por defecto
        if (allowedColumns.includes('is_deleted') && transformed.is_deleted === undefined) {
          transformed.is_deleted = false;
        }
        if (allowedColumns.includes('created_at') && !transformed.created_at) {
          transformed.created_at = new Date().toISOString();
        }
        
        // Campos requeridos con valores por defecto
        if (table === 'client_change_logs' && !transformed.description) {
          transformed.description = 'Sin descripción';
        }

        // Insertar con INSERT directo para evitar conflictos con FK
        const { error } = await supabase.from(table).insert(transformed);

        if (error) {
          // Si es error de duplicado y skipExisting es true, saltar
          if (error.code === '23505' || error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
            if (skipExisting) {
              console.log(`  ⏭️ ${doc.id}: Ya existe, saltando`);
              skippedExisting++;
            } else {
              console.log(`  ❌ ${doc.id}: Duplicado - ${error.message.substring(0, 80)}`);
              errors++;
            }
          }
          // Si es error de foreign key, registrar pero continuar
          else if (error.code === '23503' || error.message.includes('violates foreign key')) {
            console.log(`  ⚠️ ${doc.id}: FK inválida - ${error.message.substring(0, 60)}`);
            errors++;
          }
          // Si es error de check constraint
          else if (error.code === '23514') {
            console.log(`  ⚠️ ${doc.id}: Check constraint fallido - ${error.message.substring(0, 60)}`);
            errors++;
          }
          else {
            console.log(`  ❌ ${doc.id}: ${error.message.substring(0, 80)}`);
            errors++;
          }
        } else {
          imported++;
        }
      } catch (err) {
        console.log(`  ❌ ${doc.id}: ${(err as Error).message.substring(0, 80)}`);
        errors++;
      }
    }

    const summary = `${imported}/${docs.length} importados (${errors} errores`;
    console.log(`  ✅ ${summary}${skippedDeleted > 0 ? `, ${skippedDeleted} eliminados saltados` : ''}${skippedExisting > 0 ? `, ${skippedExisting} ya existentes` : ''})`);
    return { exported: docs.length, imported, errors };

  } catch (error) {
    console.error(`  ❌ Error: ${(error as Error).message}`);
    return { exported: 0, imported: 0, errors: 1 };
  }
}

// =====================================================
// MAIN
// =====================================================

async function main() {
  console.log('\n🚀 MIGRACIÓN: Firebase → Supabase\n');
  console.log('='.repeat(60));

  // Desactivar foreign keys temporalmente
  await disableForeignKeys();

  const results: Array<{ collection: string; exported: number; imported: number; errors: number }> = [];
  let totalExported = 0;
  let totalImported = 0;
  let totalErrors = 0;

  for (const collection of migrationOrder) {
    const result = await migrateCollection(collection);
    results.push({ collection, ...result });
    totalExported += result.exported;
    totalImported += result.imported;
    totalErrors += result.errors;
  }

  // Reactivar foreign keys
  await enableForeignKeys();

  // Resumen
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN\n');
  console.log(`Exportados: ${totalExported}`);
  console.log(`Importados: ${totalImported}`);
  console.log(`Errores: ${totalErrors}`);
  console.log(`Éxito: ${totalExported > 0 ? ((totalImported / totalExported) * 100).toFixed(1) : 0}%`);

  console.log('\nPor colección:');
  for (const { collection, exported, imported, errors } of results) {
    const icon = imported === exported && exported > 0 ? '✅' : imported > 0 ? '⚠️' : exported > 0 ? '❌' : '⚪';
    console.log(`  ${icon} ${collection.padEnd(25)}: ${String(imported).padStart(4)}/${String(exported).padStart(4)}`);
  }

  // Guardar mapeo
  const mappingObj = Object.fromEntries(idMapping);
  fs.writeFileSync('id-mapping-working.json', JSON.stringify(mappingObj, null, 2));
  console.log(`\n💾 Mapeo guardado: id-mapping-working.json`);
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
