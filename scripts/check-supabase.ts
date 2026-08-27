/**
 * @fileoverview Verificar solo Supabase
 */

import * as fs from 'fs';
import * as path from 'path';

// Cargar .env.local manualmente
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
  console.log('✅ Loaded .env.local');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('SUPABASE_URL:', supabaseUrl ? '✅' : '❌ MISSING');
console.log('SUPABASE_KEY:', supabaseKey ? '✅' : '❌ MISSING');

if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('\n📊 Checking Supabase Tables\n');
  console.log('='.repeat(60));
  
  const tables = [
    'companies', 'clients', 'vehicles', 'partners', 'users',
    'mileage_logs', 'financial_records', 'financial_categories',
    'credits', 'credit_payment_schedules', 'notifications'
  ];
  
  let total = 0;
  
  for (const table of tables) {
    try {
      const start = Date.now();
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      const elapsed = Date.now() - start;
      
      if (error) {
        console.log(`  ❌ ${table}: ${error.message}`);
      } else {
        console.log(`  ${count === 0 ? '⚪' : '✅'} ${table}: ${count} rows (${elapsed}ms)`);
        total += count || 0;
      }
    } catch (error) {
      console.log(`  ❌ ${table}: ${(error as Error).message}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`Total rows: ${total}`);
  
  if (total === 0) {
    console.log('\n⚠️  All tables are empty!');
    console.log('Run: npm run migrate:v2');
  } else {
    console.log('\n✅ Data found in Supabase!');
  }
}

checkTables().catch(console.error);
