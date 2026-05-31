import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'dist-types/**',
      'node_modules/**',
      '.agents/**',
      '.codex/**',
      '.codegraph/**',
      '.superpowers/**',
      'coverage/**',
      'test-results/**',
      'playwright-report/**'
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}', '*.config.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true
      }
    },
    plugins: {
      'react-hooks': reactHooks
    },
    rules: {
      ...reactHooks.configs.recommended.rules
    }
  }
);
