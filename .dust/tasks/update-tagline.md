# Update Tagline

Replace the dust tagline in `lib/templates/help.txt` and corresponding test assertions.

Replace the dust tagline from "A tool for keeping AI coding agents on track." to "Flow state for AI coding agents."

## Implementation

Change the tagline in `lib/templates/help.txt` line 1:

```
💨 dust - Flow state for AI coding agents.
```

Update the matching assertion strings in these test files:

- `lib/cli/main.test.ts` (lines 82, 117, 137)
- `lib/cli/wire.test.ts` (lines 202, 253)

Replace every occurrence of `A tool for keeping AI coding agents on track` with `Flow state for AI coding agents` in those files.

## Goals

- [Easy Adoption](../goals/easy-adoption.md)

## Blocked By

(none)

## Definition of Done

- [ ] `lib/templates/help.txt` uses the new tagline "Flow state for AI coding agents."
- [ ] All test assertions in `lib/cli/main.test.ts` and `lib/cli/wire.test.ts` match the new tagline
- [ ] `bin/dust help` outputs the new tagline
- [ ] Existing tests pass
