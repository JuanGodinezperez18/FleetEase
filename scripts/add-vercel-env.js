const { execSync } = require('child_process');

const envs = {
  'NEXT_PUBLIC_SUPABASE_URL': 'https://qettktslcbjjuyejcpqy.supabase.co',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': 'sb_publishable_4NIQIpeXR4TtMO8eJCzkAw_insEWnd9',
  'SUPABASE_SERVICE_ROLE_KEY': 'sb_secret_ysn7Ys7PVChYNwPhNU85Xg_KBFKJArQ',
  'STRIPE_SECRET_KEY': 'sk_test_51TCZYxDEayMo4wATUHZIJ93lpzODA189N3s1XKqIS59jFIWRoICbNlIme8tK1zrpueehN5jGVGkakuog7VctLK9Q00syspW4Bd',
  'STRIPE_WEBHOOK_SECRET': 'whsec_P3Zq5Mpd8Ykq6FV38m20xhcEFZkrQE7C',
  'CRON_SECRET': 'ndJvYZrIu8630P2X5gbWOVyTGCiBSFx4HcalwtAzfs7mQkRM',
  'HEALTH_CHECK_SECRET': '2jzWDPl0JmpiLCB4IfdG35hNrXHyg1FM',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY': 'pk_test_51TCZYxDEayMo4wATL7Ojuv3DLHeejl0CWCZVS299h1ZIMFnFoxGeHgbrBFtlC6V6OeExY0qTuCwCMhFEAagQOY6j00Th5GBbwN',
  'NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER': 'price_1U7UY2D2V6onxbMNjZKS03rl',
  'NEXT_PUBLIC_STRIPE_PRICE_ID_PRO': 'price_1U7UY4D2V6onxbMNSz2pDlEd',
  'NEXT_PUBLIC_STRIPE_PRICE_ID_ENTERPRISE': 'price_1U7UYWD2V6onxbMNffIeBm88',
  'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY': 'AIzaSyA3CMm9VGtSknuLWQWY3oyn78TaGKkdPCk',
  'NEXT_PUBLIC_VAPID_PUBLIC_KEY': 'LyO3Y364xcacFcF8BdnnxYniKOoOStb_CZkaxGIFKyM',
  'NEXT_PUBLIC_APP_URL': 'https://fleetease.com.mx',
  'NEXT_PUBLIC_SITE_URL': 'https://fleetease.com.mx',
  'NEXT_PUBLIC_LOG_LEVEL': 'info'
};

const sensitiveKeys = ['SUPABASE_SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'CRON_SECRET', 'HEALTH_CHECK_SECRET'];

for (const [key, value] of Object.entries(envs)) {
  const sensitive = sensitiveKeys.includes(key);
  const isPublic = key.startsWith('NEXT_PUBLIC_');
  let cmd = 'vercel env add ' + key + ' production';
  if (isPublic) {
    cmd += ' --visibility=config --no-sensitive';
  } else if (sensitive) {
    cmd += ' --sensitive';
  }
  console.log('Adding:', key);
  try {
    execSync(cmd, { 
      input: value + '\n',
      stdio: 'inherit' 
    });
    console.log('✓ Added:', key);
  } catch (e) {
    console.error('✗ Failed:', key, e.message);
  }
}