/**
 * @fileoverview Bootstrap de la base de datos Supabase nueva (vacía).
 *
 * Crea:
 *   1. La empresa inicial (tabla companies)
 *   2. El primer usuario super_admin en Supabase Auth + su fila en users
 *
 * Requisitos previos:
 *   - Ejecutar supabase-schema.sql, 002_create_missing_tables.sql,
 *     001_enable_rls_policies.sql y 003_storage_buckets_policies.sql
 *     en el SQL Editor del proyecto.
 *   - Tener .env.local con NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.
 *
 * Uso:
 *   npx tsx scripts/bootstrap-supabase.ts [email] [nombre] [--confirm]
 *
 * Ejemplos:
 *   npx tsx scripts/bootstrap-supabase.ts
 *   npx tsx scripts/bootstrap-supabase.ts admin@miempresa.mx "Admin Principal"
 *   npx tsx scripts/bootstrap-supabase.ts admin@miempresa.mx "Admin" --confirm
 *
 * Nota:
 *   Por defecto se crea el usuario SIN confirmar, para que Supabase envíe el
 *   correo de confirmación (verifica que el email provider funcione). El usuario
 *   debe hacer clic en el enlace antes de poder iniciar sesión.
 *   Usa --confirm para confirmar automáticamente (login inmediato, sin correo).
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
loadEnvFile(path.join(process.cwd(), '.env'));

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const args = process.argv.slice(2);
const adminEmail = (args[0] || '').toLowerCase().trim();
const adminName = (args[1] || '').trim();
const confirmImmediately = args.includes('--confirm');
const defaultCompanyName = 'Mi Empresa';

function generateTempPassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function findExistingSuperAdmin(): Promise<{ email: string } | null> {
  const { data, error } = await supabase
    .from('users')
    .select('email')
    .eq('role', 'super_admin')
    .eq('is_deleted', false)
    .limit(1);

  if (error) {
    console.error(`❌ Error consultando users: ${error.message}`);
    return null;
  }

  return data && data.length > 0 ? data[0] : null;
}

async function bootstrap() {
  console.log('🚀 Bootstrap de Supabase (base vacía)\n');
  console.log('='.repeat(60));

  // 1. Empresa inicial
  const { data: existingCompanies, error: companiesError } = await supabase
    .from('companies')
    .select('id, name')
    .eq('is_deleted', false)
    .limit(1);

  if (companiesError) {
    console.error(`❌ Error consultando companies: ${companiesError.message}`);
    process.exit(1);
  }

  let companyId: string;
  if (existingCompanies && existingCompanies.length > 0) {
    companyId = existingCompanies[0].id;
    console.log(`🏢 Empresa existente: ${existingCompanies[0].name} (${companyId})`);
  } else {
    const { data: company, error: companyInsertError } = await supabase
      .from('companies')
      .insert({ name: defaultCompanyName })
      .select('id, name')
      .single();

    if (companyInsertError) {
      console.error(`❌ Error creando empresa: ${companyInsertError.message}`);
      process.exit(1);
    }

    companyId = company.id;
    console.log(`🏢 Empresa creada: ${company.name} (${companyId})`);
  }

  // 2. Super admin existente
  const existingSuperAdmin = await findExistingSuperAdmin();
  if (existingSuperAdmin) {
    console.log(`✅ Ya existe un super_admin: ${existingSuperAdmin.email}`);
    console.log('   No se crea nada nuevo. Bootstrap completado.\n');
    return;
  }

  const email = adminEmail;
  if (!email) {
    console.error('❌ No hay super_admin registrado. Proporciona un email:');
    console.error('   npx tsx scripts/bootstrap-supabase.ts admin@miempresa.mx "Nombre"');
    process.exit(1);
  }

  const name = adminName || email.split('@')[0] || 'Administrador';
  const tempPassword = generateTempPassword();

  // 3. Crear el usuario en Supabase Auth
  //    email_confirm = false -> Supabase envía el correo de confirmación
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: confirmImmediately,
    user_metadata: { name },
  });

  if (authError) {
    console.error(`❌ Error creando usuario en Auth: ${authError.message}`);
    process.exit(1);
  }

  // 4. Crear la fila en la tabla users
  const { error: userInsertError } = await supabase.from('users').insert({
    id: authUser.user.id,
    email,
    name,
    role: 'super_admin',
    company_id: companyId,
    is_deleted: false,
  });

  if (userInsertError) {
    console.error(`❌ Error creando fila en users: ${userInsertError.message}`);
    console.error('   El usuario quedó en Auth. Bórralo manualmente y reintenta,');
    console.error('   o inserta manualmente la fila en users con el id:');
    console.error(`   ${authUser.user.id}`);
    process.exit(1);
  }

  console.log(`🔐 Super admin creado: ${email}`);
  console.log(`   ID: ${authUser.user.id}`);
  console.log(`   Empresa: ${defaultCompanyName} (${companyId})`);
  console.log(`   🔑 Contraseña temporal: ${tempPassword}`);

  if (confirmImmediately) {
    console.log('\n✅ Cuenta confirmada. Puedes iniciar sesión ahora.');
  } else {
    console.log('\n📧 Se envió un correo de confirmación a: ' + email);
    console.log('   ⚠️  Haz clic en el enlace del correo ANTES de iniciar sesión.');
    console.log('   Si el correo no llega, revisa en el dashboard de Supabase:');
    console.log('       Authentication → Emails (email provider / plantillas).');
  }
  console.log('\n⚠️  Guarda esta contraseña. Cámbiala en el primer inicio de sesión.');

  // Guardar credenciales en un archivo temporal
  const outFile = path.join(process.cwd(), 'temp-bootstrap-admin.json');
  fs.writeFileSync(
    outFile,
    JSON.stringify(
      {
        email,
        name,
        password: tempPassword,
        id: authUser.user.id,
        company_id: companyId,
      },
      null,
      2,
    ),
  );
  console.log(`💾 Credenciales guardadas en: ${outFile}`);

  console.log('\n✅ Bootstrap completado\n');
}

bootstrap();
