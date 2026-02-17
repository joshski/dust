# Fix Stock Audit Templates Missing Goals Section

Add the `## Goals` section to all stock audit templates in `lib/audits/stock-audits.ts`.

The `validateTaskHeadings` function in `lib/cli/commands/lint-markdown.ts` requires all task files to have `## Goals`, `## Blocked By`, and `## Definition of Done` sections. Stock audit templates currently have only `## Scope`, `## Blocked By`, and `## Definition of Done`.

## Goals

- [Lint Everything](../goals/lint-everything.md)
- [Stop the Line](../goals/stop-the-line.md)

## Blocked By

(none)

## Definition of Done

- [ ] All stock audit templates in `lib/audits/stock-audits.ts` include a `## Goals` heading
- [ ] Running `bin/dust audit <name>` creates a task that passes `bin/dust lint`
