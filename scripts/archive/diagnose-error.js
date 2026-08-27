/**
 * Diagnóstico: imprime el cuerpo real del error de PostgREST
 * Uso: node scripts/diagnose-error.js [tabla]
 */
const fs = require('fs');
const path = require('path');

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
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const table = process.argv[2] || 'companies';

fetch(`${supabaseUrl}/rest/v1/${table}?select=*&limit=1`, {
  headers: {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    Prefer: 'count=exact',
  },
})
  .then(async (res) => {
    const body = await res.text();
    console.log(`Table: ${table}`);
    console.log(`Status: ${res.status}`);
    console.log(`Headers: content-range=${res.headers.get('content-range')}`);
    console.log('Body:', body);
  })
  .catch((e) => console.error('Network error:', e.message));
