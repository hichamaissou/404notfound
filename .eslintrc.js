module.exports = {
  extends: [
    'next/core-web-vitals',
  ],
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
    'simple-import-sort',
    'unused-imports',
  ],
  root: true,
  rules: {
    // Import sorting
    'simple-import-sort/imports': 'warn',
    'simple-import-sort/exports': 'warn',
    
    // Remove unused imports
    'unused-imports/no-unused-imports': 'warn',
    'unused-imports/no-unused-vars': 'warn',
    
    // TypeScript specific rules
    '@typescript-eslint/no-unused-vars': 'off', // Handled by unused-imports
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    
    // General rules
    'prefer-const': 'warn',
    'no-var': 'warn',
    'object-shorthand': 'warn',
    'prefer-template': 'warn',
    'react/jsx-key': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
  },
  overrides: [
    {
      files: ['*.js', '*.jsx'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
  ],
}
