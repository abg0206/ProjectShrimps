import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'Backend/**/*.test.js',
      'Backend/**/*.test.ts',
      'Frontend/ats-frontend/**/*.test.jsx',
      'Frontend/ats-frontend/**/*.test.tsx',
    ],
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e-tests/**'],
  },
});
