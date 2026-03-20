# Principles tree flag

Add a `--tree` flag to `dust principles` that restores the hierarchical tree view for human browsing.

## Context

When implementing the compressed principles listing, the default output becomes agent-optimised. The `--tree` flag preserves access to the visual hierarchy for humans who want to browse the principle structure.

## Implementation

### CLI parsing

Add `--tree` flag support to the `dust principles` command. When present, render the existing tree-based output instead of the compressed format.

### Conditional rendering

In `processPrinciplesList`, check for the `--tree` flag and branch to either:
- The new compressed output (default)
- The existing `renderHierarchy` / `renderCorePrincipleHierarchy` functions

### Tests

Add tests in `lib/cli/commands/list.test.ts` that verify:
- `dust principles --tree` outputs the tree structure with connectors
- The flag is optional and defaults to compressed output

## Principles

- [Unsurprising UX](../principles/unsurprising-ux.md)
- [Context Window Efficiency](../principles/context-window-efficiency.md)

## Blocked By

(none)

## Definition of Done

- `dust principles --tree` outputs the hierarchical tree view
- `dust principles` (without flag) outputs the compressed format
- Tree output includes Core and Local sections with `├──` and `└──` connectors
- Tests verify both output modes
