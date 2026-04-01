import { Config, defineConfig } from 'eslint/config';
import cdkPlugin from 'eslint-plugin-awscdk';
import eslint from '@eslint/js';
import { configs, parser } from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';
import { importX } from 'eslint-plugin-import-x';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
// @ts-expect-error ignore type errors
import pluginPromise from 'eslint-plugin-promise';

import { includeIgnoreFile } from '@eslint/compat';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const gitignorePath = path.resolve(__dirname, '.gitignore');

const eslintConfig: Config[] = defineConfig(
  {
    ignores: [
      ...(includeIgnoreFile(gitignorePath).ignores || []),
      '**/*.d.ts',
      'src/tsconfig.json',
      'src/stories',
      '**/*.css',
      'node_modules/**/*',
      'out',
      'cdk.out',
      'dist',
      'app',
    ],
  },
  eslint.configs.recommended,
  configs.strict,
  configs.stylistic,
  pluginPromise.configs['flat/recommended'],
  {
    files: ['**/*.ts'],
    plugins: {
      'import-x': importX,
      '@stylistic': stylistic,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser,
      parserOptions: {
        projectService: false,
        tsconfigRootDir: __dirname,
        project: ['./tsconfig-eslint.json'],
      },
    },
    extends: [
      'import-x/flat/recommended',
      cdkPlugin.configs.recommended,
    ],
    settings: {
      'import-x/resolver-next': [
        createTypeScriptImportResolver({
          alwaysTryTypes: true,
        }),
      ],
    },
    rules: {
      '@stylistic/semi': ['error', 'always'],
      '@stylistic/indent': ['error', 2],
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      '@stylistic/arrow-parens': ['error', 'always'],
      '@stylistic/quotes': ['error', 'single'],
    },
  },
);

export default eslintConfig;
