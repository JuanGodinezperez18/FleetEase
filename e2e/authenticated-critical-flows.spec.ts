import { test, expect } from '@playwright/test';

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.describe('Authenticated critical flows', () => {
  test.skip(!email || !password, 'Set E2E_EMAIL and E2E_PASSWORD to run authenticated production/data-flow tests.');

  test.beforeEach(async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.locator('#email').fill(email!);
    await page.locator('#password').fill(password!);
    await page.getByRole('button', { name: /iniciar sesión|iniciar sesion|entrar/i }).click();
    await page.waitForURL(/\/dashboard(?:\/|$)/, { timeout: 30000 });
  });

  test('Gastos: page and new expense form open without runtime errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/dashboard/finanzas/expenses', { waitUntil: 'networkidle' });
    await expect(page.getByText(/Gastos/i).first()).toBeVisible();
    const addButton = page.getByRole('button', { name: /agregar gasto/i }).first();
    await expect(addButton).toBeVisible();
    await addButton.click();
    await expect(page.getByText('Registrar un nuevo gasto operativo.')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('Ingresos: page and new income form open without runtime errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/dashboard/finanzas/income', { waitUntil: 'networkidle' });
    await expect(page.getByText(/Ingresos/i).first()).toBeVisible();
    const addButton = page.getByRole('button', { name: /agregar ingreso/i }).first();
    await expect(addButton).toBeVisible();
    await addButton.click();
    await expect(page.getByText(/Categoría/i).first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('Clientes, Asignaciones and Vehículos pages remain accessible', async ({ page }) => {
    for (const [path, heading] of [
      ['/dashboard/clients', /Clientes/i],
      ['/dashboard/vehicles', /Vehículos/i],
      ['/dashboard/vehicles/assignments', /asignaciones/i],
    ] as const) {
      await page.goto(path, { waitUntil: 'networkidle' });
      await expect(page.getByText(heading).first()).toBeVisible();
    }
  });

  test('Notificaciones opens without the React Slot runtime failure', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/dashboard/notifications', { waitUntil: 'networkidle' });
    await expect(page.getByText(/Notificaciones inteligentes/i)).toBeVisible();
    expect(errors.some(error => /Slot failed to slot onto its children/i.test(error))).toBe(false);
  });

  test('Weekly rent: selecting a client keeps the assigned vehicle available', async ({ page }) => {
    await page.goto('/dashboard/finanzas/income', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /agregar ingreso/i }).first().click();

    const categoryTrigger = page.getByRole('combobox', { name: /categoría/i });
    await categoryTrigger.click();
    await page.getByRole('option', { name: /renta semanal/i }).click();

    const clientTrigger = page.getByRole('combobox', { name: /cliente/i });
    await expect(clientTrigger).toBeVisible();
    await clientTrigger.click();
    const clients = page.getByRole('option');
    const count = await clients.count();
    test.skip(count === 0, 'No active client is available in the E2E account.');
    await clients.first().click();

    const vehicleTrigger = page.getByRole('combobox', { name: /vehículo/i });
    await expect(vehicleTrigger).toBeVisible();
    await expect(vehicleTrigger).not.toHaveText(/seleccione|seleccionar/i);
  });
});
