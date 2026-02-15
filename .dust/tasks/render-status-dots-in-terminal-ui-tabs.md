# Render status dots in terminal UI tabs

Update `renderTabs()` in `lib/bucket/terminal-ui.ts` to display a colored dot before each repository name indicating agent status.

## Change Details

In `lib/bucket/terminal-ui.ts`, in `renderTabs()`:

1. For each repository tab, prepend a `●` character before the repository name:
   - Green (`ANSI.FG_GREEN`) when `agentStatuses.get(name) === 'busy'`
   - Dim (`ANSI.DIM`) when idle (the default)
2. Do not show a dot on the "All" tab.
3. Update the visible width calculation for each tab to account for the dot and its surrounding space (2 extra characters: dot + space).
4. Add tests verifying:
   - Dot appears before repository name
   - Correct ANSI color codes for idle vs busy
   - No dot on the "All" tab
   - Tab wrapping still works correctly with the wider tabs

## Goals

- [Unsurprising UX](../goals/unsurprising-ux.md)

## Blocked By

(none)

## Definition of Done

- [ ] Each repository tab shows a `●` dot before the name
- [ ] Dot is green for busy, dim for idle
- [ ] "All" tab has no dot
- [ ] Tab width calculation accounts for the dot
- [ ] Tests cover dot rendering and color states
- [ ] `bin/dust check` passes
