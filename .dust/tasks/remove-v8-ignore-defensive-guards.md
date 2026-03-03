# Remove v8 ignore: Defensive Guards

Remove unnecessary v8 ignore comments that protect defensive guards by restructuring code to eliminate the unreachable branches.

## Locations

1. `lib/bucket/terminal-ui.ts:130-132` - Unreachable return after truncation loop. The visibleLength guard on line 80 ensures truncation always occurs above.

2. `lib/bucket/terminal-ui.ts:366-368` - Map lookup fallback when repoColors is built from the same repositories array.

3. `lib/bucket/repository.ts:297-299` - Guard after has() check. The TypeScript pattern `has()` followed by `get()` doesn't narrow the type.

4. `lib/cli/commands/check.ts:154-156` - Defensive guard for lint output that's always present on failure.

5. `lib/cli/commands/list.ts:263` - Status fallback that's always set for ideas.

## Approach

For each location:
- Analyze if the defensive code is truly unnecessary
- If so, restructure to eliminate the branch (e.g., use non-null assertion with type guard, or restructure the loop)
- If the defense is actually necessary, document why and keep the ignore comment

## Blocked By

(none)

## Definition of Done

- [ ] Each defensive guard is either removed (with code restructured) or justified
- [ ] All tests pass
- [ ] Coverage remains at 100%

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Unit Test Coverage](../principles/unit-test-coverage.md)
