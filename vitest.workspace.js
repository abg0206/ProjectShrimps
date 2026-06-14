import { defineWorkspace } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineWorkspace([
  // Backend configuration
  {
    test: {
      name: 'backend',
      root: './Backend', // 👈 Capitalized to match project directory standards
      environment: 'node',
      include: ['**/*.test.js', '**/*.test.ts'],
    },
  },
  // Frontend configuration
  {
    extends: './Frontend/ats-frontend/vite.config.ts', // 👈 Point to your real case-sensitive path
    test: {
      name: 'frontend',
      root: './Frontend/ats-frontend', // 👈 Point to your real case-sensitive path
      environment: 'jsdom',
      include: ['**/*.test.jsx', '**/*.test.tsx'],
      setupFiles: ['./vitest.setup.ts'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './Frontend/ats-frontend/src'),
      },
    },
  },
]);
