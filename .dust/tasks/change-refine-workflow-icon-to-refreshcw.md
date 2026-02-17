# Change refine workflow icon to RefreshCw

Update the workflow icon for "refine" from Pencil to RefreshCw in the dustbucket codebase. This makes the "Refine scheduled" label icon consistent with the "Refine Idea" button, which already uses RefreshCw.

## Goals

- [Unsurprising UX](../goals/unsurprising-ux.md)

## Blocked By

(none)

## Definition of Done

- [ ] `src/lib/workflow-icons.ts` imports `RefreshCw` from lucide-react instead of `Pencil`
- [ ] `workflowIcons.refine` is set to `RefreshCw`
- [ ] Tests pass
