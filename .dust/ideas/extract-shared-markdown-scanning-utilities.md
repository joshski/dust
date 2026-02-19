# Extract shared markdown scanning utilities

The original duplication between `list.ts` and `next.ts` has been resolved — shared utilities now live in `lib/markdown/markdown-utilities.ts`. A few inline regex instances remain in `workflow-tasks.ts` (3) and `audit.ts` (1) but may not warrant extraction per the Reasonably DRY principle.

## Findings

- `list.ts` and `next.ts` now properly import and use the shared `extractTitle`/`extractOpeningSentence` utilities.
- `lib/workflow-tasks.ts` has 3 inline instances of `content.match(/^#\s+(.+)$/m)` that could use `extractTitle()` instead.
- `lib/cli/commands/audit.ts` has 1 inline instance used for title replacement (different purpose — extracts title to rebuild it with a prefix).
- Directory scanning (`readdir` + `.md` filter) is repeated but is a one-liner that doesn't warrant abstraction.

## Open Questions

### Should the 3 remaining inline regex uses in workflow-tasks.ts be refactored to use extractTitle()?

#### Yes, refactor to use extractTitle()

Consistency across the codebase and single source of truth for the title extraction pattern.

#### No, leave as-is

The duplication is minor (a single regex) and refactoring would add a dependency from `workflow-tasks.ts` on `markdown-utilities.ts` that doesn't currently exist. Per the Reasonably DRY principle, the coupling may not be justified.

### Should the audit.ts inline regex be replaced?

#### Yes, extract a shared replaceTitle utility

Would centralize all title-related operations in `markdown-utilities.ts`.

#### No, leave as-is

The audit.ts case uses the regex for replacement, not extraction — `extractTitle()` alone wouldn't fully replace it. The use case is distinct enough to justify inline code.
