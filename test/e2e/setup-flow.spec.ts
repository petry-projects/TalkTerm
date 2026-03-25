import { test, expect } from '@playwright/test';

test.describe('Setup Flow', () => {
  test('shows API key setup as first screen', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Get Started')).toBeVisible();
    await expect(page.getByPlaceholder('sk-ant-api03-...')).toBeVisible();
  });

  test('Continue button is disabled without valid key', async ({ page }) => {
    await page.goto('/');
    const continueButton = page.getByRole('button', { name: /continue/i });
    await expect(continueButton).toBeDisabled();
  });

  test('help link is present', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/how do i get an api key/i)).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('page has proper heading structure', async ({ page }) => {
    await page.goto('/');
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
  });

  test('form inputs are keyboard accessible', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();
  });
});
