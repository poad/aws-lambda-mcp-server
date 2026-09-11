// oxlint.config.ts
import { defineConfig } from 'oxlint';
import cdkPlugin from 'oxlint-plugin-awscdk';

export default defineConfig({
  extends: [
    // ✅ Add plugins
    cdkPlugin.configs.recommended, // or cdkPlugin.configs.strict
  ],
  plugins: ['promise', 'typescript', 'import'],
  jsPlugins: ['oxlint-plugin-awscdk'],
  rules: {
    'awscdk/construct-constructor-property': 'error',
    'awscdk/no-construct-in-interface': 'error',
    'awscdk/no-construct-in-public-property-of-construct': 'error',
    'awscdk/no-construct-stack-suffix': 'error',
    'awscdk/no-mutable-property-of-props-interface': 'warn',
    'awscdk/no-mutable-public-property-of-construct': 'warn',
    'awscdk/no-parent-name-construct-id-match': [
      'error',
      {
        disallowContainingParentName: false,
      },
    ],
    'awscdk/no-unused-props': 'error',
    'awscdk/no-variable-construct-id': 'error',
    'awscdk/pascal-case-construct-id': 'error',
    'awscdk/prefer-grants-property': 'warn',
    'awscdk/require-passing-this': [
      'error',
      {
        allowNonThisAndDisallowScope: true,
      },
    ],
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
