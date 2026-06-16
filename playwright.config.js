import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e-tests', // 👈 Point it here
  testMatch: '**/*.spec.ts',
  use: {
    headless: true,
  },
});
