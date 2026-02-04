# Exclude system tests from coverage reporting

Update vitest configuration to exclude system tests from coverage measurement, ensuring coverage reporting focuses solely on unit tests.

## Changes Required

### Update `vitest.config.ts`

1. Add `exclude` configuration to prevent vitest from discovering tests in the `system-tests/` directory
2. Add a clarifying comment explaining that vitest is only used for coverage reporting and should not include system tests

The configuration should make clear that:
- vitest exists purely for coverage reporting purposes
- The `system-tests/` directory contains system tests that are intentionally excluded
- Only unit tests (co-located with source in `lib/`) are in scope for coverage

Example structure:
```typescript
export default defineConfig({
  test: {
    // vitest is used only for coverage reporting
    // System tests in system-tests/ are excluded - they run via bun test
    exclude: ['system-tests/**'],
    coverage: {
      // ... existing coverage config
    },
  },
})
```

### Rename `tests/` to `system-tests/`

Rename the directory to accurately reflect that these are system tests (not unit tests).

### Update facts

Update `.dust/facts/end-to-end-tests.md` to use "system tests" terminology and reference the new `system-tests/` directory.

## Goals

- [Unit Test Coverage](../goals/unit-test-coverage.md)
- [Fast Feedback](../goals/fast-feedback.md)

## Blocked by

(none)

## Definition of done

- [ ] `tests/` directory renamed to `system-tests/`
- [ ] `vitest.config.ts` excludes `system-tests/**` from test discovery
- [ ] Comment in config explains vitest is for coverage reporting only
- [ ] Comment in config explains why system tests are excluded
- [ ] Facts updated to reference `system-tests/` directory
- [ ] `bun run test:coverage` only runs unit tests from `lib/`
- [ ] System tests continue to run normally via `bun test`
