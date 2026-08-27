/**
 * Script para verificar la conexión con Supabase
 * Uso: npx tsx scripts/test-supabase-connection.ts
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

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Verificando conexión con Supabase...\n');
console.log(`URL: ${supabaseUrl}`);
console.log(`Key (primeros 20 chars): ${supabaseAnonKey?.substring(0, 20)}...\n`);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Faltan variables de entorno de Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    // Test 1: Verificar conexión básica
    console.log('📡 Test 1: Conexión básica...');
    const { data: healthData, error: healthError } = await supabase
      .from('companies')
      .select('count')
      .limit(1);
    
    if (healthError) {
      console.error(`❌ Error de conexión: ${healthError.message}`);
      console.error(`   Código: ${healthError.code}`);
      console.error(`   Detalles: ${healthError.details}`);
    } else {
      console.log('✅ Conexión básica exitosa\n');
    }

    // Test 2: Verificar autenticación
    console.log('🔐 Test 2: Verificando autenticación...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log(`ℹ️ No hay sesión activa (esto es normal si no has iniciado sesión): ${authError.message}`);
    } else if (user) {
      console.log(`✅ Usuario autenticado: ${user.email}\n`);
    } else {
      console.log('ℹ️ No hay usuario autenticado (esto es normal)\n');
    }

    // Test 3: Verificar tablas existentes
    console.log('📊 Test 3: Verificando tablas...');
    const tables = [
      'companies',
      'users',
      'clients',
      'vehicles',
      'partners',
      'credits',
      'mileage_logs',
      'financial_records',
      'notifications',
      'multas',
    ];

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('id')
        .limit(1);
      
      if (error) {
        console.log(`   ❌ ${table}: ${error.message}`);
      } else {
        console.log(`   ✅ ${table}: Accesible`);
      }
    }

    console.log('\n✅ Verificación completada');

  } catch (error) {
    console.error(`\n❌ Error fatal: ${(error as Error).message}`);
  }
}

testConnection();
