/**
 * Script de migración CORREGIDO - Maneja IDs no UUID y columnas inválidas
 * Uso: node scripts/migrate-fixed.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const admin = require('firebase-admin');

// =====================================================
// CARGAR .env.local
// =====================================================

const envLocalPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf-8');
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
  console.log('✅ .env.local cargado');
}

// =====================================================
// INICIALIZAR FIREBASE
// =====================================================

const firebaseConfig = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!firebaseConfig.projectId || !firebaseConfig.clientEmail || !firebaseConfig.privateKey) {
  console.error('❌ Faltan credenciales de Firebase');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: firebaseConfig.projectId,
    clientEmail: firebaseConfig.clientEmail,
    privateKey: firebaseConfig.privateKey,
  }),
});
console.log('✅ Firebase inicializado');

// =====================================================
// INICIALIZAR SUPABASE
// =====================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan credenciales de Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
console.log('✅ Supabase inicializado');

// =====================================================
// MAPEO DE IDs Y COLUMNAS VÁLIDAS
// =====================================================

const idMap = new Map();

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function getUUID(collection, oldId) {
  if (!oldId) return null;
  const key = `${collection}:${oldId}`;
  if (!idMap.has(key)) {
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(oldId)) {
      idMap.set(key, oldId);
    } else {
      idMap.set(key, generateUUID());
    }
  }
  return idMap.get(key);
}

// Columnas válidas por tabla (según el schema de Supabase)
const validColumns = {
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
// TRANSFORMADORES
// =====================================================

function camelToSnake(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function transformValue(value, collection) {
  if (value === null || value === undefined) return null;

  // Timestamp de Firestore -> ISO String
  if (value?._seconds !== undefined) {
    return new Date(value._seconds * 1000).toISOString();
  }

  // GeoPoint
  if (value?.latitude !== undefined && value?.longitude !== undefined) {
    return { latitude: value.latitude, longitude: value.longitude };
  }

  // DocumentReference -> ID convertido a UUID
  if (value?.path !== undefined && typeof value.path === 'string') {
    const parts = value.path.split('/');
    const refCollection = parts[0];
    const refId = parts.pop() || '';
    return getUUID(refCollection, refId);
  }

  // Arrays
  if (Array.isArray(value)) {
    return value.map(v => transformValue(v, collection));
  }

  // Objetos
  if (typeof value === 'object' && !(value instanceof Date)) {
    const transformed = {};
    for (const [key, val] of Object.entries(value)) {
      transformed[camelToSnake(key)] = transformValue(val, collection);
    }
    return transformed;
  }

  return value;
}

function transformDoc(doc, collectionName) {
  const data = doc.data ? doc.data() : doc;
  const oldId = doc.id;
  const newId = getUUID(collectionName, oldId);

  const transformed = { id: newId };
  const tableName = collectionToTable[collectionName];
  const allowedColumns = validColumns[tableName] || [];

  for (const [key, value] of Object.entries(data)) {
    const snakeKey = camelToSnake(key);

    // Solo incluir columnas válidas
    if (!allowedColumns.includes(snakeKey)) {
      continue;
    }

    const transformedValue = transformValue(value, collectionName);

    // Valores por defecto para campos requeridos
    if (snakeKey === 'is_deleted' && transformedValue === null) {
      transformed[snakeKey] = false;
    } else if (transformedValue !== null && transformedValue !== undefined) {
      transformed[snakeKey] = transformedValue;
    }
  }

  // Campos requeridos por tabla
  const now = new Date().toISOString();
  if (allowedColumns.includes('created_at') && !transformed.created_at) {
    transformed.created_at = now;
  }
  if (allowedColumns.includes('is_deleted') && transformed.is_deleted === undefined) {
    transformed.is_deleted = false;
  }

  return transformed;
}

// =====================================================
// CONFIGURACIÓN DE MIGRACIÓN
// =====================================================

const collectionToTable = {
  'companies': 'companies',
  'users': 'users',
  'financialCategories': 'financial_categories',
  'clients': 'clients',
  'partners': 'partners',
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

// Orden de migración (tablas sin FK primero)
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

// =====================================================
// FUNCIONES DE MIGRACIÓN
// =====================================================

async function migrateCollection(collection) {
  const table = collectionToTable[collection];
  if (!table) {
    console.log(`  ⚪ Sin mapeo para ${collection}`);
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
    console.log(`  ✅ Exportados ${docs.length} documentos`);

    // Transformar
    const transformed = docs.map(doc => transformDoc(doc, collection));

    // Insertar uno por uno para manejar errores
    let imported = 0;
    let errors = 0;

    for (const doc of transformed) {
      const { error } = await supabase.from(table).upsert(doc, { onConflict: 'id' });
      if (error) {
        console.log(`  ⚠️ Error ${doc.id}: ${error.message}`);
        errors++;
      } else {
        imported++;
      }
    }

    console.log(`  ✅ Importados ${imported}/${docs.length} (${errors} errores)`);
    return { exported: docs.length, imported, errors };

  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    return { exported: 0, imported: 0, errors: 1 };
  }
}

// =====================================================
// MAIN
// =====================================================

async function main() {
  console.log('\n🚀 Migración CORREGIDA a Supabase\n');
  console.log('='.repeat(60));

  const results = [];
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
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  // Resumen
  console.log('\n' + '='.repeat(60));
  console.log('📊 Resumen\n');
  console.log(`Exportados: ${totalExported}`);
  console.log(`Importados: ${totalImported}`);
  console.log(`Errores: ${totalErrors}`);
  console.log(`Éxito: ${totalExported > 0 ? ((totalImported/totalExported)*100).toFixed(1) + '%' : '0%'}`);

  console.log('\nPor colección:');
  for (const { collection, exported, imported, errors } of results) {
    const icon = imported === exported && exported > 0 ? '✅' : (imported > 0 ? '⚠️' : (exported > 0 ? '❌' : '⚪'));
    console.log(`  ${icon} ${collection}: ${imported}/${exported} (${errors} err)`);
  }

  // Guardar mapeo de IDs
  const mappingData = Object.fromEntries(idMap);
  const mappingFile = path.join(__dirname, '..', 'id-mapping-fixed.json');
  fs.writeFileSync(mappingFile, JSON.stringify(mappingData, null, 2));
  console.log(`\n💾 Mapeo de IDs guardado: ${mappingFile}`);

  if (totalImported === totalExported && totalImported > 0) {
    console.log('\n🎉 ¡Migración completada con éxito!\n');
  } else if (totalImported > 0) {
    console.log('\n⚠️ Migración completada con advertencias\n');
  } else {
    console.log('\n❌ Migración fallida\n');
  }
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
