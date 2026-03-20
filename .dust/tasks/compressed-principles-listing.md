# Compressed principles listing

Replace the tree-based `dust principles` output with a compact, agent-optimised format that favours brevity over visual hierarchy.

## Context

The current `dust principles` output renders two full hierarchy trees (Core and Local) followed by a flat list. This produces 100+ lines where most content is tree-drawing characters (`├──`, `│`, `└──`) and repeated path prefixes. Agents are the primary consumers of this command and don't benefit from visual tree rendering—the hierarchy information is available in each principle's body.

## Implementation

### Output format

State each directory once as a header, then list principles as `* slug.md` with the opening sentence indented on the next line:

```
🎯 Principles

Principles are guiding values and design constraints. Principles describe how decisions should be made and what matters most.

🎯 Core Principles (node_modules/@joshski/dust/.dust/principles/)

* actionable-errors.md
  Error messages should tell you what to do next, not just what went wrong.

* agent-autonomy.md
  Dust exists to enable AI agents to produce work autonomously.

🎯 Local Principles (.dust/principles/)

* batteries-included.md
  Dust should provide everything required for an agent to be productive.
```

Including the `.md` extension means agents can construct the full read path by concatenating the header directory with the filename.

### Functional core

Extract a pure `formatPrincipleEntry(slug: string, openingSentence: string | null): string[]` function and a `formatPrinciplesSection(header: string, entries: PrincipleEntry[]): string[]` function. These take values in and return an array of lines to output—no side effects.

### Imperative shell

The existing `processPrinciplesList` function remains the shell. It reads principles from the file system, calls the pure formatting functions, and writes to stdout.

### Tests

Update `lib/cli/commands/list.test.ts` to assert the new output format. Existing tests that check for tree connectors (`├──`, `└──`) should be updated or removed.

## Principles

- [Context Window Efficiency](../principles/context-window-efficiency.md)
- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Progressive Disclosure](../principles/progressive-disclosure.md)

## Blocked By

(none)

## Definition of Done

- `dust principles` outputs the compact format by default
- Core principles section shows the package path as header
- Local principles section shows `.dust/principles/` as header
- Each principle entry is `* slug.md` followed by an indented opening sentence
- Pure formatting functions are unit-testable without file system access
- Existing tests are updated to match the new output format
