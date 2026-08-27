/**
 * Verificar Supabase - Node.js puro
 * Uso: node scripts/check-simple.js
 */

const fs = require('fs');
const path = require('path');

// Cargar .env.local
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

console.log('\n🔍 Checking Supabase Connection\n');
console.log('URL:', supabaseUrl || '❌ MISSING');
console.log('KEY:', supabaseKey ? '✅ (hidden)' : '❌ MISSING');

if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ Error: Missing Supabase credentials\n');
  process.exit(1);
}

// Hacer petición directa a la API de Supabase
const https = require('https');

async function checkTable(tableName) {
  return new Promise((resolve) => {
    const url = `${supabaseUrl}/rest/v1/${tableName}?select=*&limit=0`;
    
    const options = {
      hostname: supabaseUrl.replace('https://', ''),
      port: 443,
      path: `/rest/v1/${tableName}?select=*&limit=0`,
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'count=exact'
      }
    };

    const req = https.request(options, (res) => {
      const count = res.headers['content-range'];
      if (res.statusCode === 200) {
        const match = count ? count.match(/\/(\d+)$/) : null;
        const rowCount = match ? match[1] : '0';
        resolve({ table: tableName, count: parseInt(rowCount), status: 'ok' });
      } else {
        resolve({ table: tableName, count: 0, status: 'error', statusCode: res.statusCode });
      }
    });

    req.on('error', (e) => {
      resolve({ table: tableName, count: 0, status: 'error', message: e.message });
    });

    req.setTimeout(5000);
    req.end();
  });
}

async function main() {
  const tables = [
    'companies', 'clients', 'vehicles', 'partners', 'users',
    'mileage_logs', 'financial_records', 'credits'
  ];

  console.log('\n📊 Checking Tables\n');
  console.log('='.repeat(60));

  let total = 0;
  let emptyTables = 0;

  for (const table of tables) {
    process.stdout.write(`Checking ${table}... `);
    const result = await checkTable(table);
    
    if (result.status === 'ok') {
      console.log(`✅ ${result.count} rows`);
      total += result.count;
      if (result.count === 0) emptyTables++;
    } else {
      console.log(`❌ Error ${result.statusCode || result.message}`);
      emptyTables++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Total rows: ${total}`);
  console.log(`Empty tables: ${emptyTables}/${tables.length}`);

  if (total === 0) {
    console.log('\n⚠️  ALL TABLES ARE EMPTY!\n');
    console.log('Next steps:');
    console.log('1. Go to Supabase Dashboard: https://qettktslcbjjuyejcpqy.supabase.co');
    console.log('2. Check if tables exist in Table Editor');
    console.log('3. Run migration: npm run migrate:v2\n');
  } else {
    console.log('\n✅ Data found in Supabase!\n');
  }
}

main().catch(console.error);
