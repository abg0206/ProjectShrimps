import { test, expect } from '@playwright/test';

test('dummy passing test for CI setup', async ({ page }) => {
  // This assertion will always pass instantly without even needing to navigate to a website
  expect(true).toBe(true);
});
