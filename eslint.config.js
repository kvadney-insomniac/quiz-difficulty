// ESLint flat config. Typecheck-aware rules run over src, test and examples;
// the example is linted because the test suite executes it.
//
// Flat config reference: https://eslint.org/docs/latest/use/configure/configuration-files
// typescript-eslint getting started: https://typescript-eslint.io/getting-started/
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/', '.drafts/'] },
  js.configs.recommended,
  {
    files: ['**/*.ts'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // tsc already enforces noUnusedLocals and noUnusedParameters, with the
      // underscore convention used in the tests. Mirror that convention here.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Plain Node scripts and this config: not part of the TypeScript program.
    files: ['eslint.config.js', 'scripts/**/*.mjs'],
    languageOptions: {
      globals: { process: 'readonly', console: 'readonly', URL: 'readonly' },
    },
  },
);
