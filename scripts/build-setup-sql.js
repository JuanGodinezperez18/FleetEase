/**
 * @fileoverview Genera un único script SQL consolidado para el SQL Editor de Supabase.
 *
 * Concatenación en orden de dependencia:
 *   1. supabase-schema.sql                  (extensiones, tipos, tablas, funciones)
 *   2. supabase/migrations/002_*.sql        (plans, user_invitations, plan_limit_logs)
 *   3. supabase/migrations/001_*.sql        (RLS corregido)
 *   4. supabase/migrations/003_*.sql        (storage buckets + policies)
 *
 * Uso:
 *   node scripts/build-setup-sql.js
 *   -> genera supabase/setup-consolidated.sql
 *
 * Pégalo completo en el SQL Editor del proyecto nuevo y ejecuta.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

const parts = [
  'supabase-schema.sql',
  path.join('supabase', 'migrations', '002_create_missing_tables.sql'),
  path.join('supabase', 'migrations', '001_enable_rls_policies.sql'),
  path.join('supabase', 'migrations', '003_storage_buckets_policies.sql'),
];

const header = `-- =====================================================
-- FLEETEASE MANAGER - SETUP COMPLETO SUPABASE (CONSOLIDADO)
-- =====================================================
-- Generado por scripts/build-setup-sql.js
-- Fecha: ${new Date().toISOString()}
--
-- INSTRUCCIONES:
--   1. Abre el SQL Editor de tu proyecto Supabase nuevo.
--   2. Pega TODO el contenido de este archivo y ejecútalo (Run).
--   3. El script es idempotente: se puede volver a ejecutar sin dañar nada.
--   4. Después, configura Auth (Site URL + redirects) y ejecuta:
--        npx tsx scripts/bootstrap-supabase.ts admin@tuempresa.mx "Nombre"
-- =====================================================

`;

let output = header;

for (const rel of parts) {
  const filePath = path.join(root, rel);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ No existe: ${rel}`);
    process.exit(1);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  output += `-- =====================================================
-- >>> INICIO: ${rel}
-- =====================================================
\n${content}\n\n`;
}

const outPath = path.join(root, 'supabase', 'setup-consolidated.sql');
fs.writeFileSync(outPath, output, 'utf-8');

console.log(`✅ Generado: supabase/setup-consolidated.sql`);
console.log(`   Tamaño: ${(output.length / 1024).toFixed(1)} KB`);
console.log(`   Pégalo completo en el SQL Editor y ejecútalo.`);
