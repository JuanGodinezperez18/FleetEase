import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const require = createRequire(import.meta.url);
const { user, fixtureResponse } = require('./test-support/csp-supabase-fixture.cjs');
const executablePath = process.env.CHROME_PATH;
const httpOnly = process.argv.includes('--http-only');
if (!httpOnly) assert.ok(executablePath, 'CHROME_PATH is required');
const baseURL = 'http://127.0.0.1:3101';
const server = spawn(process.execPath, [
  '-r', fileURLToPath(new URL('./test-support/csp-supabase-fixture.cjs', import.meta.url)),
  'node_modules/next/dist/bin/next', 'start', '-p', '3101', '--hostname', '127.0.0.1',
], {
  env: { ...process.env, FLEETEASE_CSP_FIXTURE: '1', NEXT_PUBLIC_SUPABASE_URL: 'https://ci-placeholder.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'ci-placeholder-anon-key', SUPABASE_SERVICE_ROLE_KEY: 'ci-placeholder-service-role-key' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverLog = '';
server.stdout.on('data', chunk => { serverLog += chunk; process.stdout.write(chunk); });
server.stderr.on('data', chunk => { serverLog += chunk; process.stdout.write(chunk); });
let browser;
try {
  let ready = false;
  for (let attempt = 0; attempt < 20; attempt++) {
    try { ready = (await fetch(baseURL, { signal: AbortSignal.timeout(3000) })).ok; } catch {}
    if (ready) break;
    if (server.exitCode !== null) throw new Error(serverLog);
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.ok(ready, serverLog);
  console.log('CSP fixture server ready');
  if (httpOnly) {
    const expires = Math.floor(Date.now() / 1000) + 3600;
    const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
    const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, exp: expires, aal: 'aal1', amr: [], role: 'authenticated' })}.test-signature`;
    const session = { access_token: token, refresh_token: 'test-refresh', expires_at: expires, expires_in: 3600, token_type: 'bearer', user };
    const response = await fetch(`${baseURL}/dashboard/messages`, { headers: { Cookie: `sb-ci-placeholder-auth-token=base64-${encode(session)}` }, redirect: 'manual', signal: AbortSignal.timeout(10000) });
    assert.equal(response.status, 200);
    const policy = response.headers.get('content-security-policy');
    const nonce = policy.match(/'nonce-([^']+)'/)[1];
    assert.ok(response.headers.get('cache-control').includes('no-store'));
    const html = await response.text();
    const inlineScripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].filter(match => !/\bsrc=/.test(match[1]));
    assert.ok(inlineScripts.length > 0);
    assert.ok(inlineScripts.every(match => match[1].includes(`nonce="${nonce}"`)), 'All inline HTML scripts must match CSP nonce');
    const publicResponse = await fetch(baseURL);
    assert.ok(!publicResponse.headers.get('content-security-policy').includes('nonce-'));
    console.log(`HTTP CSP smoke passed: ${inlineScripts.length} inline scripts match protected nonce; private cache and public HTML verified. Browser hydration is not exercised in HTTP-only mode.`);
  } else {
  browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext();
  await context.route('https://ci-placeholder.supabase.co/**', async route => {
    const request = route.request();
    assert.equal(request.method(), 'GET', 'Fixture must never write');
    await route.fulfill({ json: fixtureResponse(new URL(request.url()), request.headers().accept ?? '') });
  });
  const page = await context.newPage();
  const violations = [];
  page.on('console', message => {
    if (/Refused to execute|Executing inline script violates/i.test(message.text())) violations.push(message.text());
  });
  const publicResponse = await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  console.log('Public HTML loaded');
  assert.equal(publicResponse.status(), 200);
  assert.ok(!publicResponse.headers()['content-security-policy'].includes('nonce-'));
  await page.waitForFunction(() => document.documentElement.dataset.feBootHidden === 'true');

  const expires = Math.floor(Date.now() / 1000) + 3600;
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const accessToken = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, exp: expires, aal: 'aal1', amr: [], role: 'authenticated' })}.test-signature`;
  const session = { access_token: accessToken, refresh_token: 'test-refresh', expires_at: expires, expires_in: 3600, token_type: 'bearer', user };
  await context.addCookies([{ name: 'sb-ci-placeholder-auth-token', value: `base64-${encode(session)}`, url: baseURL }]);
  const response = await page.goto(`${baseURL}/dashboard/messages`, { waitUntil: 'domcontentloaded' });
  console.log('Protected HTML loaded', page.url());
  assert.equal(response.status(), 200);
  assert.equal(new URL(page.url()).pathname, '/dashboard/messages');
  const policy = response.headers()['content-security-policy'];
  const nonce = policy.match(/'nonce-([^']+)'/)[1];
  assert.ok(response.headers()['cache-control'].includes('no-store'));
  assert.ok(!policy.split('; ').find(item => item.startsWith('script-src ')).includes("'unsafe-inline'"));
  await page.getByRole('tab', { name: 'Clientes', exact: true }).waitFor();
  await page.getByRole('tab', { name: 'Socios', exact: true }).click();
  assert.equal(await page.getByRole('tab', { name: 'Socios', exact: true }).getAttribute('data-state'), 'active');
  assert.equal(await page.getByRole('tab', { name: 'Usuarios', exact: true }).count(), 0);
  assert.equal(await page.locator('a[href="/dashboard/reports/history"]').count(), 0);
  const inlineNonces = await page.locator('script:not([src])').evaluateAll(scripts => scripts.map(script => script.nonce));
  assert.ok(inlineNonces.length > 0);
  assert.ok(inlineNonces.every(value => value === nonce), 'All inline scripts, including Next/theme/boot scripts, need the response nonce');
  assert.deepEqual(violations, [], 'Trusted scripts must hydrate without CSP violations');
  await page.evaluate(() => {
    const script = document.createElement('script');
    script.textContent = 'window.__cspInjectionExecuted = true';
    document.body.appendChild(script);
  });
  assert.equal(await page.evaluate(() => window.__cspInjectionExecuted), undefined, 'Untrusted inline script must be blocked');
  console.log('CSP smoke passed: public hydration, protected hydration, tabs, removed dead actions, matching nonces, private cache, injected script blocked. Supabase is mocked; no real writes.');
  }
} catch (error) {
  console.error(serverLog);
  throw error;
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
