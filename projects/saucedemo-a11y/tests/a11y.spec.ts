import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const users = {
  standard: { username: 'standard_user', password: 'secret_sauce' },
};

async function login(page: any) {
  await page.goto('/');
  await page.getByPlaceholder('Username').fill(users.standard.username);
  await page.getByPlaceholder('Password').fill(users.standard.password);
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/inventory.html/);
}

async function checkA11y(page: any, contextName: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();

  const msg = `${contextName}: ${results.violations.length} accessibility violation(s)`;
  expect(results.violations, msg).toEqual([]);
}

test.describe('SauceDemo accessibility baseline', () => {
  test('login page should pass WCAG A/AA checks', async ({ page }) => {
    await page.goto('/');
    await checkA11y(page, 'Login page');
  });

  test('inventory page should pass WCAG A/AA checks', async ({ page }) => {
    await login(page);
    await checkA11y(page, 'Inventory page');
  });

  test('cart page should pass WCAG A/AA checks', async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: '1' }).first().click({ trial: true }).catch(() => {});
    await page.getByRole('button', { name: 'Add to cart Sauce Labs Backpack' }).click();
    await page.getByRole('link', { name: /shopping cart/i }).click();
    await expect(page).toHaveURL(/cart.html/);
    await checkA11y(page, 'Cart page');
  });

  test('checkout information page should pass WCAG A/AA checks', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Add to cart Sauce Labs Backpack' }).click();
    await page.getByRole('link', { name: /shopping cart/i }).click();
    await page.getByRole('button', { name: 'Checkout' }).click();
    await expect(page).toHaveURL(/checkout-step-one.html/);
    await checkA11y(page, 'Checkout: Your Information');
  });
});
