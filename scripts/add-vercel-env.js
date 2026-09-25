const { execSync } = require('child_process');

// Security: secrets must NEVER be committed to the repository.
// Provide them through the local environment when running this helper.
const envNames = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'CRON_SECRET',
  'HEALTH_CHECK_SECRET',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_PRICE_ID_STARTER_MONTHLY',
  'STRIPE_PRICE_ID_STARTER_YEARLY',
  'STRIPE_PRICE_ID_PRO_MONTHLY',
  'STRIPE_PRICE_ID_PRO_YEARLY',
  'STRIPE_PRICE_ID_ENTERPRISE_MONTHLY',
  'STRIPE_PRICE_ID_ENTERPRISE_YEARLY',
  'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY',
  'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_LOG_LEVEL'
];

const sensitiveKeys = new Set([
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'CRON_SECRET',
  'HEALTH_CHECK_SECRET'
]);

for (const key of envNames) {
  const value = process.env[key];
  if (!value) {
    console.error(`Missing environment variable: ${key}`);
    process.exitCode = 1;
    continue;
  }

  const sensitive = sensitiveKeys.has(key);
  const isPublic = key.startsWith('NEXT_PUBLIC_');
  let cmd = `vercel env add ${key} production`;

  if (isPublic) {
    cmd += ' --visibility=config --no-sensitive';
  } else if (sensitive) {
    cmd += ' --sensitive';
  }

  console.log('Adding:', key);
  try {
    execSync(cmd, { input: value + '\n', stdio: 'inherit' });
    console.log('✓ Added:', key);
  } catch (e) {
    console.error('✗ Failed:', key, e.message);
    process.exitCode = 1;
  }
}
