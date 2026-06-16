import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e-tests',
  testMatch: '**/*.spec.ts',
  use: {
    headless: true,
  },
});
