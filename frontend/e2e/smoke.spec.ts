import { test, expect } from '@playwright/test';

// Full user journey through the real UI: register -> create a collection ->
// add a request -> send it -> see a response. Requires the running stack.
test('register, create collection, send a request, see the response', async ({ page }) => {
  const email = `e2e-${Date.now()}@rocket.test`;

  // Register.
  await page.goto('/register');
  await page.getByLabel('Name').fill('E2E');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('supersecret');
  await page.getByRole('button', { name: 'Create account' }).click();

  // Lands in the workspace.
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByText('COLLECTIONS', { exact: true })).toBeVisible();

  // Create a collection (the name comes from a window.prompt).
  page.once('dialog', (d) => d.accept('E2E Collection'));
  await page.getByTitle('New collection').click();
  await expect(page.getByText('E2E Collection')).toBeVisible();

  // Add a request to it, then select it.
  await page.getByTitle('Add request').first().click();
  await page.getByText('New Request').click();

  // Fill the URL and send.
  await page.getByPlaceholder('https://api.example.com/endpoint').fill('https://postman-echo.com/get');
  await page.getByRole('button', { name: 'Send', exact: true }).click();

  // The response viewer shows a 2xx status and a time.
  await expect(page.getByText(/^200/)).toBeVisible({ timeout: 20_000 });
});
