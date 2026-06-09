import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  // Backend configuration
  {
    test: {
      name: 'backend',
      root: './backend',
      environment: 'node', // Standard Node.js environment
      include: ['**/*.test.js'],
    },
  },
  // Frontend configuration
  {
    test: {
      name: 'frontend',
      root: './frontend',
      environment: 'jsdom', // Simulates a browser wrapper
      include: ['**/*.test.jsx', '**/*.test.tsx'],
      // If using React/Vue, you can add your plugins here
    },
  },
]);
