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
loadEnvFile(path.join(process.cwd(), '.env'));

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

const tables = [
  'companies', 'users', 'clients', 'vehicles', 'partners',
  'mileage_logs', 'financial_records', 'financial_categories',
  'credits', 'credit_payment_schedules', 'notifications',
  'vehicle_assignment_logs', 'company_change_logs', 'client_change_logs',
  'message_templates', 'message_logs', 'multas',
  'fcm_tokens', 'audit_logs', 'documents',
  'gps_configs', 'seguimientos', 'plans',
  'user_invitations', 'plan_limit_logs'
];

async function check() {
  console.log('Estado actual de la base de datos');
  console.log('='.repeat(60));

  for (const table of tables) {
    const { error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`  ${table.padEnd(28)} ERROR  ${error.code} - ${error.message}`);
    } else {
      console.log(`  ${table.padEnd(28)} OK     ${count} filas`);
    }
  }

  // Verificar sesión/usuarios
  console.log('\nAuth:');
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 10 });
  if (error) {
    console.log(`  listUsers ERROR: ${error.message}`);
  } else {
    console.log(`  ${data.users.length} usuarios en auth.users`);
    for (const u of data.users) {
      console.log(`    - ${u.email}  confirmed:${u.email_confirmed_at ? 'si' : 'no'}  created:${u.created_at}`);
    }
  }
}

check();
