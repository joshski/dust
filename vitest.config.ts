import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

// vitest is used only for coverage reporting.
// System tests in system-tests/ are excluded - they run via bun test.
// Only unit tests (co-located with source in lib/) are in scope for coverage.
export default defineConfig({
  esbuild: {
    legalComments: 'inline',
  },
  test: {
    exclude: ['system-tests/**', 'node_modules/**', '.claude/**'],
    coverage: {
      provider: 'istanbul',
      include: ['lib/**/*.ts'],
      exclude: [
        'lib/cli/run.ts',
        'lib/version.ts',
        'lib/test/**',
        'lib/bucket/native-io.ts',
      ],
      reporter: [
        [resolve(import.meta.dirname, 'lib/istanbul/minimal-reporter.cjs')],
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
})
