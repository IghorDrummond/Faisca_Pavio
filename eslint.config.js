import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist/**', 'dist-e2e/**', 'node_modules/**', 'public/**', 'Skill/**', 'test-results/**', 'playwright-report/**', 'tmp/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    languageOptions: { ecmaVersion: 2023, sourceType: 'module' },
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-restricted-syntax': [
        'error',
        { selector: "CallExpression[callee.name='eval']", message: 'eval é proibido (CSP).' },
        { selector: "NewExpression[callee.name='Function']", message: 'new Function é proibido (CSP).' },
      ],
      'no-restricted-properties': ['error', { property: 'innerHTML', message: 'Use textContent (segurança).' }],
    },
  },
  {
    files: ['src/core/**/*.ts', 'src/data/**/*.ts'],
    rules: {
      'no-restricted-globals': ['error', 'window', 'document', 'navigator', 'localStorage', 'indexedDB'],
      'no-restricted-imports': ['error', { patterns: ['phaser', '*/game/*', '*/platform/*', '*/services/*'] }],
    },
  },
);
