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
        'lib/bucket/repository.ts',
        // bucket.ts: 100% line/statement/branch but v8 reports <100% function
        // coverage for the `/* v8 ignore */`-wrapped thin wrappers (defaultSetup*).
        // Excluded until v8 honors ignore comments for function-level metrics.
        'lib/cli/commands/bucket.ts',
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
