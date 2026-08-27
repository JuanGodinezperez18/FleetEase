/**
 * Script para verificar usuarios en Firebase Auth y Supabase Auth
 * Uso: npx tsx scripts/check-users.ts
 */

import * as fs from 'fs';
import * as path from 'path';

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
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkUsers() {
  console.log('🔍 Verificando usuarios...\n');

  // Firebase Auth
  console.log('📱 Firebase Auth:');
  try {
    const listUsersResult = await admin.auth().listUsers(1000);
    console.log(`   Total usuarios: ${listUsersResult.users.length}\n`);
    
    for (const user of listUsersResult.users) {
      console.log(`   - UID: ${user.uid}`);
      console.log(`     Email: ${user.email || 'N/A'}`);
      console.log(`     Nombre: ${user.displayName || 'N/A'}`);
      console.log(`     Provider: ${user.providerData.map(p => p.providerId).join(', ') || 'N/A'}`);
      console.log(`     Creado: ${user.metadata.creationTime}`);
      console.log('');
    }
  } catch (error) {
    console.error(`   ❌ Error: ${(error as Error).message}`);
  }

  // Supabase Auth
  console.log('\n🟢 Supabase Auth:');
  try {
    const { data: users, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error(`   ❌ Error: ${error.message}`);
    } else {
      console.log(`   Total usuarios: ${users.users.length}\n`);
      
      for (const user of users.users) {
        console.log(`   - UID: ${user.id}`);
        console.log(`     Email: ${user.email || 'N/A'}`);
        console.log(`     Nombre: ${user.user_metadata?.name || 'N/A'}`);
        console.log(`     Provider: ${user.app_metadata?.provider || 'N/A'}`);
        console.log(`     Creado: ${user.created_at}`);
        console.log('');
      }
    }
  } catch (error) {
    console.error(`   ❌ Error: ${(error as Error).message}`);
  }

  // Users table in Supabase
  console.log('\n📊 Tabla "users" en Supabase:');
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, role, company_id');
    
    if (error) {
      console.error(`   ❌ Error: ${error.message}`);
    } else {
      console.log(`   Total registros: ${data.length}\n`);
      
      for (const user of data) {
        console.log(`   - ID: ${user.id}`);
        console.log(`     Email: ${user.email || 'N/A'}`);
        console.log(`     Nombre: ${user.name || 'N/A'}`);
        console.log(`     Role: ${user.role || 'N/A'}`);
        console.log(`     Company ID: ${user.company_id || 'N/A'}`);
        console.log('');
      }
    }
  } catch (error) {
    console.error(`   ❌ Error: ${(error as Error).message}`);
  }
}

checkUsers();
