const https = require('https');

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const PROJECT_ID = 'prj_juPKhmFfeq4JZovY7ao6y5wApmoP';
const TEAM_ID = 'godinezjosejuan1-4393s-projects';

const envs = {
  'NEXT_PUBLIC_SUPABASE_URL': { value: 'https://qettktslcbjjuyejcpqy.supabase.co', target: ['production', 'preview', 'development'], type: 'plain' },
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': { value: 'sb_publishable_4NIQIpeXR4TtMO8eJCzkAw_insEWnd9', target: ['production', 'preview', 'development'], type: 'plain' },
  'SUPABASE_SERVICE_ROLE_KEY': { value: 'sb_secret_ysn7Ys7PVChYNwPhNU85Xg_KBFKJArQ', target: ['production', 'preview', 'development'], type: 'secret' },
  'STRIPE_SECRET_KEY': { value: 'sk_test_51TCZYxDEayMo4wATUHZIJ93lpzODA189N3s1XKqIS59jFIWRoICbNlIme8tK1zrpueehN5jGVGkakuog7VctLK9Q00syspW4Bd', target: ['production', 'preview', 'development'], type: 'secret' },
  'STRIPE_WEBHOOK_SECRET': { value: 'whsec_P3Zq5Mpd8Ykq6FV38m20xhcEFZkrQE7C', target: ['production', 'preview', 'development'], type: 'secret' },
  'CRON_SECRET': { value: 'ndJvYZrIu8630P2X5gbWOVyTGCiBSFx4HcalwtAzfs7mQkRM', target: ['production', 'preview', 'development'], type: 'secret' },
  'HEALTH_CHECK_SECRET': { value: '2jzWDPl0JmpiLCB4IfdG35hNrXHyg1FM', target: ['production', 'preview', 'development'], type: 'secret' },
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY': { value: 'pk_test_51TCZYxDEayMo4wATL7Ojuv3DLHeejl0CWCZVS299h1ZIMFnFoxGeHgbrBFtlC6V6OeExY0qTuCwCMhFEAagQOY6j00Th5GBbwN', target: ['production', 'preview', 'development'], type: 'plain' },
  'NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER': { value: 'price_1U7UY2D2V6onxbMNjZKS03rl', target: ['production', 'preview', 'development'], type: 'plain' },
  'NEXT_PUBLIC_STRIPE_PRICE_ID_PRO': { value: 'price_1U7UY4D2V6onxbMNSz2pDlEd', target: ['production', 'preview', 'development'], type: 'plain' },
  'NEXT_PUBLIC_STRIPE_PRICE_ID_ENTERPRISE': { value: 'price_1U7UYWD2V6onxbMNffIeBm88', target: ['production', 'preview', 'development'], type: 'plain' },
  'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY': { value: 'AIzaSyA3CMm9VGtSknuLWQWY3oyn78TaGKkdPCk', target: ['production', 'preview', 'development'], type: 'plain' },
  'NEXT_PUBLIC_VAPID_PUBLIC_KEY': { value: 'LyO3Y364xcacFcF8BdnnxYniKOoOStb_CZkaxGIFKyM', target: ['production', 'preview', 'development'], type: 'plain' },
  'NEXT_PUBLIC_APP_URL': { value: 'https://fleetease.com.mx', target: ['production', 'preview', 'development'], type: 'plain' },
  'NEXT_PUBLIC_SITE_URL': { value: 'https://fleetease.com.mx', target: ['production', 'preview', 'development'], type: 'plain' },
  'NEXT_PUBLIC_LOG_LEVEL': { value: 'info', target: ['production', 'preview', 'development'], type: 'plain' },
};

function apiRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.vercel.com',
      path: '/v9' + path,
      method: method,
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function addEnvVars() {
  if (!VERCEL_TOKEN) {
    console.error('Set VERCEL_TOKEN environment variable first');
    process.exit(1);
  }

  for (const [key, config] of Object.entries(envs)) {
    console.log(`Adding ${key}...`);
    try {
      const result = await apiRequest('POST', `/projects/${PROJECT_ID}/env`, {
        key,
        value: config.value,
        target: config.target,
        type: config.type,
        comment: `Added via script - ${new Date().toISOString()}`
      });
      console.log(`✓ ${key}:`, result.uid || 'OK');
    } catch (e) {
      console.error(`✗ ${key}:`, e.message);
    }
  }
}

addEnvVars();