import globals from 'globals';
export default [
  { ignores: ['node_modules/**', 'dist/**', 'test-results/**'] },
  {
    files: ['**/*.mjs', '**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      'no-undef': 'error',
      'no-unreachable': 'error',
      'no-dupe-args': 'error',
      'no-dupe-keys': 'error',
      'no-unsafe-finally': 'error',
      'no-constant-binary-expression': 'error',
      'no-invalid-regexp': 'error',
      'no-unexpected-multiline': 'error',
      'valid-typeof': 'error',
      'constructor-super': 'error',
      'no-this-before-super': 'error',
      'no-setter-return': 'error',
      'no-async-promise-executor': 'error',
    },
  },
];
