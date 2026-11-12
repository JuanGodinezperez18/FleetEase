import assert from 'node:assert/strict';
import { build } from 'esbuild';

const paymentRoute = '/qa-credit-payment';
const rpcRoute = '/qa-credit-payment-rpc';
const data = {
  selectedCompanyId: 'qa-company',
  clients: [{ id: 'qa-client', firstname: 'Cliente', lastname: 'QA' }],
  financialCategories: [{ type: 'payment', name: 'Pago de Crédito' }],
  financialRecords: [],
  partners: [],
  vehicles: [],
  creditPaymentSchedules: [],
};

const mocks = {
  '@/contexts/auth-provider': `export const useAuth = () => ({
    currentUser: { uid: 'qa-admin', companyId: 'qa-company' },
  });`,
  '@/contexts/data-provider': `const data = ${JSON.stringify(data)};
    const completed = document.getElementById('root').dataset.completed === 'true';
    data.credits = [{
      id: 'qa-credit', clientId: 'qa-client', companyId: 'qa-company', startDate: '2026-01-01',
      status: completed ? 'completed' : 'active', remainingBalance: completed ? 0 : 4,
    }];
    data.refreshData = async () => {};
    export const useData = () => data;
    export const calculatePartnerBalance = () => 0;`,
  '@/lib/supabase': `export const supabase = {
    from() {
      const query = { select: () => query, eq: () => query, order: async () => ({ data: [] }) };
      return query;
    },
    async rpc(name, payload) {
      try {
        const response = await fetch('${rpcRoute}', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, payload }),
        });
        return { data: await response.json() };
      } catch {
        return { error: { message: 'Respuesta perdida en la prueba' } };
      }
    },
  };`,
};

export async function verifyCreditPaymentReload(browser, baseURL) {
  const bundle = await build({
    entryPoints: ['scripts/test-support/credit-payment-reload-fixture.tsx'],
    bundle: true,
    jsx: 'automatic',
    write: false,
    define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [{
      name: 'isolated-credit-payment',
      setup(plugin) {
        plugin.onResolve({ filter: /.*/ }, args => {
          if (Object.hasOwn(mocks, args.path)) return { path: args.path, namespace: 'qa-fixture' };
          if (args.path.endsWith('/payment-history-view')) return { path: 'history', namespace: 'qa-fixture' };
        });
        plugin.onLoad({ filter: /.*/, namespace: 'qa-fixture' }, args => ({
          contents: args.path === 'history' ? 'export const PaymentHistoryView = () => null;' : mocks[args.path],
        }));
      },
    }],
  });

  const origin = new URL(baseURL).origin;
  const context = await browser.newContext();
  const page = await context.newPage();
  const calls = [];
  const payments = new Set();
  try {
    await page.route(`${origin}${paymentRoute}`, route => route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html><meta charset="utf-8"><div id="root" data-completed="${payments.size > 0}"></div><script src="${paymentRoute}.js"></script>`,
    }));
    await page.route(`${origin}${paymentRoute}.js`, route => route.fulfill({
      contentType: 'application/javascript',
      body: bundle.outputFiles[0].text,
    }));
    await page.route(`${origin}${rpcRoute}`, async route => {
      const call = route.request().postDataJSON();
      calls.push(call);
      const alreadyRegistered = payments.has(call.payload.p_request_id);
      payments.add(call.payload.p_request_id);
      if (calls.length === 1) {
        await route.abort('connectionreset');
        return;
      }
      await route.fulfill({ json: { success: true, paymentId: 'qa-payment', idempotentReplay: alreadyRegistered } });
    });

    await page.goto(`${origin}${paymentRoute}`);
    await page.getByRole('combobox').filter({ hasText: 'Pago de Cliente' }).click();
    await page.getByRole('option', { name: 'Pago de Crédito', exact: true }).click();
    await page.getByRole('combobox', { name: 'Crédito / Cliente' }).click();
    await page.getByRole('option', { name: /Cliente QA/ }).click();
    await page.getByRole('spinbutton').fill('4');
    await page.getByPlaceholder('Opcional', { exact: true }).fill('QA recarga');
    await page.getByRole('button', { name: 'Registrar pago', exact: true }).click();
    const retry = page.getByRole('button', { name: 'Reintentar pago', exact: true });
    await retry.waitFor({ state: 'visible' });
    assert.equal(calls.length, 1);

    await page.reload();
    await retry.waitFor({ state: 'visible' });
    assert.equal(calls.length, 1, 'Reload must not submit the payment automatically');
    await retry.click();
    await retry.waitFor({ state: 'hidden' });
    assert.equal(calls.length, 2);
    assert.equal(calls[0].name, 'process_credit_payment_once');
    assert.match(calls[0].payload.p_request_id, /^[0-9a-f-]{36}$/);
    assert.deepEqual(calls[1], calls[0]);
    assert.equal(payments.size, 1);

    await page.reload();
    await page.getByRole('button', { name: 'Registrar pago', exact: true }).waitFor();
    assert.equal(await retry.count(), 0, 'A confirmed payment must not reappear');
    console.log('Credit payment browser regression passed: lost response, reload, same request ID and one synthetic payment.');
  } finally {
    await context.close();
  }
}
