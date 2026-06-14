import js from '@eslint/js';
import globals from 'globals';

export default [
  // 1. Global ignores must sit in their own object at the top
  {
    ignores: ['**/dist/**'],
  },
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser, // 2. Enable browser globals
        ...globals.node, // 3. Enable Node.js globals
        ...globals.jest,
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'error',
    },
  },
];
