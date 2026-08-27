/**
 * Script de migración con debugging
 * Uso: npx tsx scripts/migrate-debug.ts
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
import { createClient } from '@supabase/supabase-js';

// Inicializar Firebase
const firebaseConfig = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

admin.initializeApp({
  credential: admin.credential.cert(firebaseConfig as any),
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

console.log('✅ Firebase y Supabase inicializados\n');

// UUID generator
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

// ID Mapping
const idMapping: Record<string, Record<string, string>> = {};

function getOrCreateUUID(collection: string, oldId: string): string | null {
  if (!oldId) return null;
  if (!idMapping[collection]) idMapping[collection] = {};
  if (!idMapping[collection][oldId]) {
    idMapping[collection][oldId] = isValidUUID(oldId) ? oldId : generateUUID();
  }
  return idMapping[collection][oldId];
}

async function testMigration() {
  console.log('🧪 TEST: Migrando solo la primera compañía\n');

  const db = admin.firestore();
  const snapshot = await db.collection('companies').limit(1).get();

  if (snapshot.empty) {
    console.log('No hay compañías');
    return;
  }

  const doc = snapshot.docs[0];
  const oldId = doc.id;
  const data = doc.data();

  console.log('📄 Documento original:');
  console.log('  ID:', oldId);
  console.log('  Datos:', JSON.stringify(data, null, 2));

  // Transformar
  const newId = getOrCreateUUID('companies', oldId);
  console.log('\n🔄 Transformación:');
  console.log('  oldId:', oldId);
  console.log('  newId:', newId);

  const transformed: any = {
    id: newId,
    name: data.name || 'Unknown',
    is_deleted: false,
    created_at: new Date().toISOString(),
  };

  console.log('\n📄 Documento transformado:');
  console.log('  ', JSON.stringify(transformed, null, 2));

  // Intentar insertar
  console.log('\n💾 Insertando en Supabase...');
  const { data: result, error } = await supabase
    .from('companies')
    .upsert(transformed, { onConflict: 'id' });

  if (error) {
    console.log('  ❌ Error:', error.message);
    console.log('  Error details:', JSON.stringify(error, null, 2));
  } else {
    console.log('  ✅ Insertado correctamente');
  }

  // Verificar
  console.log('\n🔍 Verificando inserción...');
  const { data: verify, error: verifyError } = await supabase
    .from('companies')
    .select('*')
    .eq('id', newId)
    .single();

  if (verifyError) {
    console.log('  ❌ Error verificando:', verifyError.message);
  } else {
    console.log('  ✅ Encontrado:', verify.name);
  }
}

testMigration().catch(console.error);
