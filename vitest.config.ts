import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

// vitest is used only for coverage reporting.
// System tests in system-tests/ are excluded - they run via bun test.
// Only unit tests (co-located with source in lib/) are in scope for coverage.
export default defineConfig({
  test: {
    exclude: ['system-tests/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.ts'],
      exclude: [
        'lib/cli/run.ts',
        'lib/version.ts',
        'lib/test/**',
        // v8 does not honor `/* v8 ignore */` comments for function-level metrics
        // on native wrapper functions. This file uses inline ignores for
        // line/statement coverage but must be excluded for 100% function coverage.
        'lib/cli/commands/bucket-worker.ts',
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
