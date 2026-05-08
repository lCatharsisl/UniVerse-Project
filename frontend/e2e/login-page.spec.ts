import { test, expect } from '@playwright/test';

test.describe('Login shell (cross-browser)', () => {
  test('shows the login landing with a primary heading', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});
