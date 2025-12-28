import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Miniprogram uses CommonJS
    'miniprogram/**',
    // Debug and test scripts
    'check-*.js',
    'check-*.ts',
    'cleanup-*.js',
    'debug-*.js',
    'test-*.js',
    'verify-*.js',
  ]),
])

export default eslintConfig
