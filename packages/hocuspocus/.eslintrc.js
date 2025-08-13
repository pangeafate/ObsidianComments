module.exports = {
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  env: {
    node: true,
    es6: true,
    jest: true
  },
  rules: {
    // Allow console.log in this service since it's used for logging
    'no-console': 'off',
    // Allow unused vars with underscore prefix
    'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
    // Allow require statements
    'no-undef': 'off' // TypeScript handles this
  },
  ignorePatterns: [
    'dist/**',
    'node_modules/**',
    'coverage/**',
    '*.js'
  ]
};