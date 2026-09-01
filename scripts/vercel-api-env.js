const https = require('https');

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const PROJECT_ID = process.env.VERCEL_PROJECT_ID || 'prj_juPKhmFfeq4JZovY7ao6y5wApmoP';

// Security: never hardcode credentials in source control.
// Export the variables locally before running this helper.
const envNames = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'CRON_SECRET',
  'HEALTH_CHECK_SECRET',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER',
  'NEXT_PUBLIC_STRIPE_PRICE_ID_PRO',
  'NEXT_PUBLIC_STRIPE_PRICE_ID_ENTERPRISE',
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

const envs = Object.fromEntries(
  envNames.map((key) => {
    const value = process.env[key];
    if (!value) throw new Error(`Missing environment variable: ${key}`);
    return [key, {
      value,
      target: ['production', 'preview', 'development'],
      type: sensitiveKeys.has(key) ? 'secret' : 'plain'
    }];
  })
);

function apiRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.vercel.com',
      path: '/v9' + path,
      method,
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function addEnvVars() {
  if (!VERCEL_TOKEN) throw new Error('Set VERCEL_TOKEN environment variable first');

  for (const [key, config] of Object.entries(envs)) {
    console.log(`Adding ${key}...`);
    try {
      const result = await apiRequest('POST', `/projects/${PROJECT_ID}/env`, {
        key,
        value: config.value,
        target: config.target,
        type: config.type,
      });
      console.log(`✓ ${key}:`, result.uid || 'OK');
    } catch (e) {
      console.error(`✗ ${key}:`, e.message);
      process.exitCode = 1;
    }
  }
}

addEnvVars().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
