/**
 * Script para migrar usuarios de Firebase Auth a Supabase Auth
 * Genera contraseñas temporales y crea los usuarios en Supabase
 * Uso: npx tsx scripts/migrate-users-to-supabase.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * Genera una contraseña temporal segura
 */
function generateTempPassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * Genera un UUID v4
 */
function generateUUID(): string {
  return crypto.randomUUID();
}

async function migrateUsers() {
  console.log('🔄 Migrando usuarios de Firebase Auth a Supabase Auth...\n');

  // Obtener usuarios de Firebase
  const listUsersResult = await admin.auth().listUsers(1000);
  const firebaseUsers = listUsersResult.users;

  console.log(`📱 Usuarios encontrados en Firebase: ${firebaseUsers.length}\n`);

  const results: Array<{
    email: string;
    uid: string;
    status: 'success' | 'error' | 'exists';
    tempPassword?: string;
    supabaseId?: string;
    error?: string;
  }> = [];

  for (const firebaseUser of firebaseUsers) {
    console.log(`🔄 Procesando: ${firebaseUser.email || 'Sin email'}`);

    // Verificar si ya existe en Supabase
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', firebaseUser.email)
      .limit(1);

    if (checkError) {
      console.log(`   ❌ Error verificando usuario: ${checkError.message}`);
      results.push({
        email: firebaseUser.email || 'unknown',
        uid: firebaseUser.uid,
        status: 'error',
        error: checkError.message,
      });
      continue;
    }

    if (existingUsers && existingUsers.length > 0) {
      console.log(`   ⏭️ Usuario ya existe en tabla users, saltando Auth`);
      results.push({
        email: firebaseUser.email || 'unknown',
        uid: firebaseUser.uid,
        status: 'exists',
      });
      continue;
    }

    // Generar contraseña temporal
    const tempPassword = generateTempPassword();
    const userId = generateUUID();

    // Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: firebaseUser.email || '',
      password: tempPassword,
      email_confirm: true, // Confirmar email automáticamente
      user_metadata: {
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuario',
        firebase_uid: firebaseUser.uid,
      },
    });

    if (authError) {
      console.log(`   ❌ Error creando en Auth: ${authError.message}`);
      results.push({
        email: firebaseUser.email || 'unknown',
        uid: firebaseUser.uid,
        status: 'error',
        error: authError.message,
      });
      continue;
    }

    console.log(`   ✅ Creado en Auth: ${authData.user.id}`);

    // Obtener datos del usuario de la tabla users (si existen)
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', firebaseUser.uid)
      .single();

    // Crear registro en tabla users si no existe
    if (!userData) {
      const { error: insertError } = await supabase.from('users').insert({
        id: authData.user.id,
        email: firebaseUser.email,
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuario',
        role: 'admin',
        is_deleted: false,
        created_at: new Date().toISOString(),
      });

      if (insertError) {
        console.log(`   ⚠️ Error creando en tabla users: ${insertError.message}`);
      } else {
        console.log(`   ✅ Creado en tabla users`);
      }
    }

    results.push({
      email: firebaseUser.email || 'unknown',
      uid: firebaseUser.uid,
      status: 'success',
      tempPassword,
      supabaseId: authData.user.id,
    });

    console.log('');
  }

  // Resumen
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN DE MIGRACIÓN\n');

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const existsCount = results.filter(r => r.status === 'exists').length;

  console.log(`✅ Exitosos: ${successCount}`);
  console.log(`⏭️ Ya existían: ${existsCount}`);
  console.log(`❌ Errores: ${errorCount}`);
  console.log('');

  // Mostrar contraseñas temporales
  const successResults = results.filter(r => r.status === 'success');
  if (successResults.length > 0) {
    console.log('🔑 CONTRASEÑAS TEMPORALES (GUARDAR EN LUGAR SEGURO)');
    console.log('='.repeat(60));
    for (const result of successResults) {
      console.log(`\n   Email: ${result.email}`);
      console.log(`   Password: ${result.tempPassword}`);
      console.log(`   Supabase ID: ${result.supabaseId}`);
    }
    console.log('');
    console.log('⚠️ IMPORTANTE: Los usuarios deberán cambiar su contraseña en el primer login');
    console.log('💾 Guardando contraseñas en: temp-passwords.json\n');

    // Guardar contraseñas temporales
    const passwordsFile = path.join(process.cwd(), 'temp-passwords.json');
    fs.writeFileSync(
      passwordsFile,
      JSON.stringify(
        successResults.map(r => ({
          email: r.email,
          tempPassword: r.tempPassword,
          supabaseId: r.supabaseId,
          firebaseUid: r.uid,
        })),
        null,
        2
      )
    );
  }

  // Mostrar errores
  const errorResults = results.filter(r => r.status === 'error');
  if (errorResults.length > 0) {
    console.log('\n❌ ERRORES\n');
    for (const result of errorResults) {
      console.log(`   ${result.email}: ${result.error}`);
    }
  }
}

migrateUsers().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
