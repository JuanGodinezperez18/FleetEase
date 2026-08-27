/**
 * Script para crear en Supabase Auth los usuarios que ya están en la tabla users
 * pero no existen en auth.users
 * Uso: npx tsx scripts/fix-missing-auth-users.ts
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

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function generateTempPassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function fixMissingAuthUsers() {
  console.log('🔍 Buscando usuarios en tabla users que no existen en Auth...\n');

  // Obtener todos los usuarios de la tabla users
  const { data: usersTable, error: usersError } = await supabase
    .from('users')
    .select('id, email, name, role')
    .eq('is_deleted', false);

  if (usersError) {
    console.error(`❌ Error obteniendo usuarios: ${usersError.message}`);
    process.exit(1);
  }

  console.log(`📊 Usuarios en tabla users: ${usersTable?.length || 0}\n`);

  // Obtener todos los usuarios de Auth
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error(`❌ Error obteniendo Auth users: ${authError.message}`);
    process.exit(1);
  }

  const authUserIds = new Set(authData.users.map(u => u.id));
  console.log(`🔐 Usuarios en Auth: ${authData.users.length}\n`);

  // Encontrar usuarios faltantes
  const missingUsers = usersTable?.filter(u => !authUserIds.has(u.id)) || [];
  
  if (missingUsers.length === 0) {
    console.log('✅ Todos los usuarios de la tabla users existen en Auth');
    return;
  }

  console.log(`⚠️ Usuarios faltantes en Auth: ${missingUsers.length}\n`);

  const createdUsers: Array<{ email: string; name: string; password: string; id: string }> = [];

  for (const user of missingUsers) {
    console.log(`🔄 Creando en Auth: ${user.email}`);
    
    const tempPassword = generateTempPassword();

    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email || '',
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        name: user.name || user.email?.split('@')[0] || 'Usuario',
      },
    });

    if (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
      continue;
    }

    console.log(`   ✅ Creado: ${data.user.id}`);
    console.log(`   🔑 Password: ${tempPassword}\n`);

    createdUsers.push({
      email: user.email || '',
      name: user.name || 'Usuario',
      password: tempPassword,
      id: data.user.id,
    });
  }

  // Guardar contraseñas
  if (createdUsers.length > 0) {
    const file = path.join(process.cwd(), 'temp-passwords-new-users.json');
    fs.writeFileSync(file, JSON.stringify(createdUsers, null, 2));
    console.log(`\n💾 Contraseñas guardadas en: ${file}`);
  }

  console.log('\n✅ Proceso completado');
}

fixMissingAuthUsers();
