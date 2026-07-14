import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./test-setup.js'],
    include: [
      'Backend/**/*.test.js',
      'Backend/**/*.test.ts',
      'Frontend/ats-frontend/**/*.test.jsx',
      'Frontend/ats-frontend/**/*.test.tsx',
    ],
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e-tests/**'],
  },
});
