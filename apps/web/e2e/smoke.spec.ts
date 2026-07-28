import { test, expect } from '@playwright/test';

test.describe('public smoke', () => {
  test('home page renders brand and CTA', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /get started/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('heading').first()).toBeVisible();
  });

  test('login page is reachable', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/login/);
  });
});
