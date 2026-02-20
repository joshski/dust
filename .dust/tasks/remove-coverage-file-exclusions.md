# Remove coverage file exclusions

Remove file-level exclusions from `vitest.config.ts` for `bucket.ts`, `repository.ts`, and `repository-loop.ts`. Individual thin wrappers will continue using inline `/* v8 ignore */` comments.

## Requirements

1. Remove these entries from `vitest.config.ts` coverage exclusions:
   - `lib/bucket/repository.ts`
   - `lib/bucket/repository-loop.ts`
   - `lib/cli/commands/bucket.ts`
2. Ensure all non-wrapper code in these files is covered by tests
3. Verify v8 honors the inline ignore comments for function-level metrics

## Implementation Notes

- This task depends on the extraction tasks being completed first
- If v8 still reports false negatives for function-level metrics on thin wrappers, document the issue and consider keeping file exclusions
- The goal is to have coverage reporting work correctly with inline ignores only

## Principles

- [Comprehensive Test Coverage](../principles/comprehensive-test-coverage.md)
- [Unit Test Coverage](../principles/unit-test-coverage.md)

## Blocked By

(none)

## Definition of Done

- [ ] `lib/bucket/repository.ts` removed from vitest exclusions
- [ ] `lib/bucket/repository-loop.ts` removed from vitest exclusions
- [ ] `lib/cli/commands/bucket.ts` removed from vitest exclusions
- [ ] Coverage runs without false negatives on thin wrapper functions
- [ ] `bin/dust check` passes with 100% coverage thresholds
