import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000';
const executablePath = process.env.CHROME_PATH;

if (!executablePath) {
  throw new Error('CHROME_PATH must point to a Chrome/Chromium executable.');
}

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

try {
  const page = await browser.newPage();
  const publicResponse = await page.goto(baseURL, { waitUntil: 'domcontentloaded' });

  assert.ok(publicResponse, 'The public landing page must return a response.');
  assert.equal(publicResponse.status(), 200, 'The public landing page should return HTTP 200.');
  assert.ok((await page.locator('body').innerText()).trim().length > 0, 'The public page should render visible content.');

  const protectedResponse = await page.goto(new URL('/dashboard/vehicles', baseURL).toString(), {
    waitUntil: 'domcontentloaded',
  });

  assert.ok(protectedResponse, 'The protected route must return a response.');
  assert.equal(new URL(page.url()).pathname, '/login', 'Unauthenticated dashboard access must redirect to login.');

  console.log('E2E smoke checks passed: public landing page renders and protected dashboard redirects to login.');
} finally {
  await browser.close();
}
