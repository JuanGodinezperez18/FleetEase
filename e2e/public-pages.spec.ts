import { test, expect } from '@playwright/test';

const publicPages = [
  ['home', '/'],
  ['soluciones', '/soluciones'],
  ['funciones', '/funciones'],
  ['software para flotillas', '/software-para-flotillas'],
  ['software para renta de vehiculos', '/software-para-renta-de-vehiculos'],
  ['mantenimiento de flotillas', '/control-de-mantenimiento-de-flotillas'],
] as const;

test.describe('Public marketing pages', () => {
  for (const [name, path] of publicPages) {
    test(`${name} loads without a server error`, async ({ page }) => {
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text());
      });

      const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBeLessThan(400);
      await expect(page.locator('main')).toBeVisible();
      expect(errors).toEqual([]);
    });
  }
});

test('protected dashboard routes redirect unauthenticated users to login', async ({ page }) => {
  for (const path of ['/dashboard', '/dashboard/finanzas/expenses', '/dashboard/finanzas/income', '/dashboard/clients', '/dashboard/vehicles', '/dashboard/notifications']) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
  }
});
