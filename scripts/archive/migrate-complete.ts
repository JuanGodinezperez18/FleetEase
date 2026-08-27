/**
 * Script de migración COMPLETA de Firebase a Supabase
 *
 * Este script:
 * 1. Pre-escanea todos los IDs de Firebase
 * 2. Genera UUIDs válidos para cada ID
 * 3. Migra los datos transformando todas las referencias
 *
 * Uso: npx tsx scripts/migrate-complete.ts
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

// Inicializar Firebase Admin
const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!firebaseAdminConfig.projectId || !firebaseAdminConfig.clientEmail || !firebaseAdminConfig.privateKey) {
  console.error('❌ Faltan credenciales de Firebase Admin');
  process.exit(1);
}

try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: firebaseAdminConfig.projectId,
      clientEmail: firebaseAdminConfig.clientEmail,
      privateKey: firebaseAdminConfig.privateKey,
    }),
  });
  console.log('✅ Firebase Admin inicializado');
} catch (error) {
  console.error('❌ Error inicializando Firebase:', error);
  process.exit(1);
}

// Inicializar Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan credenciales de Supabase');
  process.exit(1);
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);
console.log('✅ Supabase inicializado\n');

// =====================================================
// MAPEO DE IDs
// =====================================================

const idMapping: Record<string, Record<string, string>> = {};

function isValidUUID(str: string): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function getOrCreateUUID(collection: string, oldId: string): string | null {
  if (!oldId) return null;

  if (!idMapping[collection]) {
    idMapping[collection] = {};
  }

  if (!idMapping[collection][oldId]) {
    // Si ya es UUID válido, usarlo; si no, generar uno nuevo
    idMapping[collection][oldId] = isValidUUID(oldId) ? oldId : generateUUID();
  }

  return idMapping[collection][oldId];
}

// =====================================================
// CONFIGURACIÓN DE COLECCIONES
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

// Orden de migración (tablas padres primero)
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

// Columnas válidas por tabla (basado en el schema de Supabase)
const validColumns: Record<string, string[]> = {
  companies: ['id', 'name', 'email', 'phone', 'street', 'city', 'state', 'zip_code', 'country', 'is_deleted', 'created_at', 'updated_at', 'default_rental_days', 'maintenance_interval', 'late_payment_fee', 'grace_period_days', 'email_notifications', 'whatsapp_notifications', 'contract_template_url', 'vehicle_limit', 'plan', 'max_vehicles', 'max_users'],
  users: ['id', 'email', 'name', 'phone', 'street', 'city', 'state', 'zip_code', 'country', 'role', 'company_id', 'partner_access', 'notification_settings', 'is_deleted', 'created_at', 'updated_at', 'push_subscriptions'],
  clients: ['id', 'user_id', 'firstname', 'lastname', 'email', 'phone', 'street', 'city', 'state', 'zip_code', 'country', 'status', 'is_deleted', 'created_at', 'updated_at', 'vehicle_assigned_at', 'license_number', 'license_expiry', 'license_status', 'initial_balance', 'balance', 'security_deposit', 'assigned_vehicle_id', 'payment_behavior', 'photo_url', 'ine_url', 'license_image_url', 'company_id', 'has_active_credit', 'active_credit_id'],
  partners: ['id', 'user_id', 'firstname', 'lastname', 'name', 'email', 'phone', 'street', 'city', 'state', 'zip_code', 'country', 'initial_balance', 'balance', 'is_deleted', 'created_at', 'updated_at', 'company_id', 'vehicle_limit'],
  vehicles: ['id', 'alias', 'make', 'model', 'year', 'plate', 'serial_number', 'color', 'status', 'client_id', 'partner_id', 'cost', 'weekly_rental_value', 'acquisition_date', 'maintenance_interval', 'last_maintenance_mileage', 'current_mileage', 'insurance_company', 'insurance_policy_number', 'insurance_expiry_date', 'admin_commission', 'is_deleted', 'created_at', 'updated_at', 'company_id', 'image_url', 'circulation_card_url', 'insurance_policy_document_url', 'gps_phone_number', 'gps_phone_company', 'locked_by_credit', 'associated_credit_id'],
  financial_categories: ['id', 'name', 'type', 'affects', 'description', 'is_default', 'company_id', 'category'],
  mileage_logs: ['id', 'uid', 'vehicle_id', 'mileage', 'date', 'notes', 'source', 'financial_record_id', 'kind', 'created_at', 'updated_at', 'company_id', 'is_deleted', 'created_by'],
  financial_records: ['id', 'company_id', 'client_id', 'vehicle_id', 'partner_id', 'category_id', 'category', 'type', 'amount', 'payment_method', 'description', 'date', 'credit_id', 'credit_payment', 'credit_granted', 'credit_payment_number', 'is_pending', 'is_deleted', 'created_by', 'created_at', 'updated_at', 'evidence_urls', 'credit_payment_schedule_id', 'mileage_at_expense', 'notes'],
  credits: ['id', 'uid', 'client_id', 'vehicle_id', 'total_amount', 'paid_amount', 'remaining_balance', 'weekly_payment', 'number_of_payments', 'payments_made', 'start_date', 'status', 'is_deleted', 'created_at', 'updated_at', 'company_id', 'last_payment_date', 'last_payment_amount', 'last_payment_status'],
  credit_payment_schedules: ['id', 'credit_id', 'payment_number', 'due_date', 'amount', 'status', 'paid_amount', 'paid_date', 'company_id', 'is_deleted', 'deleted_at', 'cancelled_at', 'created_at'],
  notifications: ['id', 'uid', 'type', 'message', 'date', 'is_read', 'related_id', 'read_at', 'company_id'],
  vehicle_assignment_logs: ['id', 'vehicle_id', 'client_id', 'partner_id', 'company_id', 'assigned_at', 'unassigned_at', 'assigned_by', 'reason', 'created_at', 'start_date', 'end_date'],
  company_change_logs: ['id', 'company_id', 'change_type', 'changed_by', 'changed_by_name', 'changed_at', 'description', 'field_changed', 'previous_value', 'new_value'],
  client_change_logs: ['id', 'client_id', 'change_type', 'changed_by', 'changed_by_name', 'changed_at', 'description', 'field_changed', 'previous_value', 'new_value'],
  message_templates: ['id', 'name', 'content', 'type', 'company_id', 'created_at', 'updated_at', 'is_deleted'],
  message_logs: ['id', 'recipient_id', 'recipient_name', 'recipient_type', 'content', 'status', 'sent_by', 'sent_at', 'company_id'],
  multas: ['id', 'vehicle_id', 'client_id', 'folio', 'fecha_infraccion', 'direccion', 'descripcion', 'importe', 'recargos', 'total', 'status', 'fecha_pago', 'evidencia_urls', 'notas', 'asignado_automaticamente', 'assignment_date', 'company_id', 'created_by', 'created_at', 'updated_at', 'is_deleted'],
  fcm_tokens: ['id', 'user_id', 'token', 'created_at', 'updated_at'],
  audit_logs: ['id', 'action', 'entity_type', 'entity_id', 'entity_name', 'user_id', 'user_name', 'timestamp', 'changes', 'company_id'],
  documents: ['id', 'entity_type', 'entity_id', 'document_type', 'file_url', 'file_name', 'uploaded_by', 'uploaded_at', 'company_id', 'is_deleted'],
  gps_configs: ['id', 'vehicle_id', 'device_imei', 'device_type', 'api_endpoint', 'api_key', 'refresh_interval', 'is_active', 'created_at', 'updated_at', 'company_id'],
  seguimientos: ['id', 'vehicle_id', 'client_id', 'latitude', 'longitude', 'speed', 'heading', 'timestamp', 'notes', 'photo_url', 'created_by', 'company_id'],
};

// =====================================================
// PASO 1: PRE-SCANEAR IDs
// =====================================================

async function preScanAllIds(): Promise<void> {
  console.log('\n🔍 PASO 1: Pre-escaneando todos los IDs de Firebase...\n');
  console.log('='.repeat(60));

  const db = admin.firestore();
  let totalIds = 0;

  for (const collection of migrationOrder) {
    try {
      const snapshot = await db.collection(collection).get();

      for (const doc of snapshot.docs) {
        getOrCreateUUID(collection, doc.id);
        totalIds++;
      }

      const count = Object.keys(idMapping[collection] || {}).length;
      console.log(`  ✅ ${collection}: ${count} IDs mapeados`);
    } catch (error) {
      console.log(`  ⚠️ ${collection}: Error - ${(error as Error).message}`);
    }
  }

  console.log('='.repeat(60));
  console.log(`\n📊 Total IDs mapeados: ${totalIds}\n`);
}

// =====================================================
// PASO 2: TRANSFORMAR Y MIGRAR
// =====================================================

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function transformValue(value: any, fieldName: string, collection: string): any {
  if (value === null || value === undefined) return null;

  // Firestore Timestamp -> ISO String
  if (value?._seconds !== undefined) {
    return new Date(value._seconds * 1000).toISOString();
  }

  // GeoPoint
  if (value?.latitude !== undefined && value?.longitude !== undefined) {
    return { latitude: value.latitude, longitude: value.longitude };
  }

  // DocumentReference -> ID transformado
  if (value?.path !== undefined && typeof value.path === 'string') {
    const parts = value.path.split('/');
    const refCollection = parts[0];
    const refId = parts.pop() || '';
    return getOrCreateUUID(refCollection, refId);
  }

  // Arrays
  if (Array.isArray(value)) {
    return value.map(v => transformValue(v, fieldName, collection));
  }

  // Objetos (no fechas)
  if (typeof value === 'object' && !(value instanceof Date)) {
    const transformed: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      transformed[camelToSnake(key)] = transformValue(val, key, collection);
    }
    return transformed;
  }

  return value;
}

function transformDocument(doc: any, collectionName: string): any {
  const data = doc.data ? doc.data() : doc;
  const oldId = doc.id;
  const newId = getOrCreateUUID(collectionName, oldId);

  if (!newId) {
    throw new Error(`No se pudo generar UUID para ${collectionName}/${oldId}`);
  }

  const transformed: Record<string, any> = { id: newId };
  const tableName = collectionToTable[collectionName];
  const allowedColumns = validColumns[tableName] || [];

  for (const [key, value] of Object.entries(data)) {
    const snakeKey = camelToSnake(key);

    // Solo incluir columnas que existen en el schema
    if (!allowedColumns.includes(snakeKey)) {
      continue;
    }

    const transformedValue = transformValue(value, key, collectionName);

    if (transformedValue !== null && transformedValue !== undefined) {
      transformed[snakeKey] = transformedValue;
    }
  }

  // Valores por defecto
  const now = new Date().toISOString();
  if (allowedColumns.includes('created_at') && !transformed.created_at) {
    transformed.created_at = now;
  }
  if (allowedColumns.includes('is_deleted') && transformed.is_deleted === undefined) {
    transformed.is_deleted = false;
  }

  return transformed;
}

async function migrateCollection(collection: string): Promise<{ exported: number; imported: number; errors: number }> {
  const table = collectionToTable[collection];
  if (!table) {
    return { exported: 0, imported: 0, errors: 0 };
  }

  console.log(`\n🔄 Migrando: ${collection} → ${table}`);

  try {
    const db = admin.firestore();
    const snapshot = await db.collection(collection).get();

    if (snapshot.empty) {
      console.log(`  ⚪ Sin documentos`);
      return { exported: 0, imported: 0, errors: 0 };
    }

    const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`  📦 Exportados ${docs.length} documentos`);

    // Transformar documentos
    const transformed = docs.map(doc => transformDocument(doc, collection));

    // Insertar en lotes pequeños
    let imported = 0;
    let errors = 0;
    const batchSize = 10;

    for (let i = 0; i < transformed.length; i += batchSize) {
      const batch = transformed.slice(i, i + batchSize);

      for (const doc of batch) {
        try {
          const { error } = await supabase
            .from(table)
            .upsert(doc, { onConflict: 'id' });

          if (error) {
            // Si es error de FK, lo ignoramos por ahora
            if (error.message.includes('foreign key') || error.message.includes('Foreign key')) {
              console.log(`    ⚠️ FK Error ${doc.id}: ${error.message.substring(0, 80)}`);
            } else {
              console.log(`    ❌ Error ${doc.id}: ${error.message.substring(0, 80)}`);
            }
            errors++;
          } else {
            imported++;
          }
        } catch (err) {
          console.log(`    ❌ Excepción ${doc.id}: ${(err as Error).message.substring(0, 80)}`);
          errors++;
        }
      }

      process.stdout.write(`    Progreso: ${Math.min(i + batchSize, transformed.length)}/${transformed.length}\r`);
    }

    console.log(`\n  ✅ Importados ${imported}/${docs.length} (${errors} errores)`);
    return { exported: docs.length, imported, errors };

  } catch (error) {
    console.error(`  ❌ Error migrando ${collection}: ${(error as Error).message}`);
    return { exported: 0, imported: 0, errors: 1 };
  }
}

// =====================================================
// MAIN
// =====================================================

async function main() {
  console.log('\n🚀 MIGRACIÓN COMPLETA: Firebase → Supabase\n');
  console.log('='.repeat(60));

  // Paso 1: Pre-scanear IDs
  await preScanAllIds();

  // Guardar mapeo
  const mappingFile = path.join(process.cwd(), 'id-mapping-complete.json');
  fs.writeFileSync(mappingFile, JSON.stringify(idMapping, null, 2));
  console.log(`💾 Mapeo guardado: ${mappingFile}\n`);

  // Paso 2: Migrar datos
  console.log('='.repeat(60));
  console.log('🔄 PASO 2: Migrando datos...\n');

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

    // Pequeña pausa entre colecciones
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Resumen final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN FINAL\n');
  console.log(`Total exportados: ${totalExported}`);
  console.log(`Total importados: ${totalImported}`);
  console.log(`Total errores: ${totalErrors}`);
  console.log(`Tasa de éxito: ${totalExported > 0 ? ((totalImported / totalExported) * 100).toFixed(1) : 0}%`);

  console.log('\nPor colección:');
  for (const { collection, exported, imported, errors } of results) {
    const icon = imported === exported && exported > 0 ? '✅' : imported > 0 ? '⚠️' : exported > 0 ? '❌' : '⚪';
    console.log(`  ${icon} ${collection.padEnd(25)}: ${String(imported).padStart(4)}/${String(exported).padStart(4)} (${errors} err)`);
  }

  console.log('\n' + '='.repeat(60));
  if (totalImported === totalExported && totalImported > 0) {
    console.log('\n🎉 ¡Migración completada exitosamente!\n');
  } else if (totalImported > 0) {
    console.log('\n⚠️ Migración completada con advertencias (algunos errores de FK son normales)\n');
  } else {
    console.log('\n❌ Migración fallida\n');
  }
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
