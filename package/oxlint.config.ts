// oxlint.config.ts
import { defineConfig } from 'oxlint';

export default defineConfig({
  plugins: ['promise', 'typescript', 'import'],
  rules: {
    'promise/always-return': 'error',
    'promise/no-return-wrap': 'error',
    'promise/param-names': 'error',
    'promise/catch-or-return': 'error',
    'promise/no-nesting': 'warn',
    'promise/no-promise-in-callback': 'warn',
    'promise/no-callback-in-promise': 'warn',
    'promise/no-new-statics': 'error',
    'promise/valid-params': 'warn',
  },
});
