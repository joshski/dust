# Add `dust bucket` terminal UI

Implement the ANSI-based terminal UI for viewing logs from multiple repositories.

## Requirements

1. Display repository selector (horizontal, with "All" option first)
2. Show logs from the selected repository (or all repos with colored prefixes)
3. Support keyboard navigation:
   - Left/Right arrows: switch between repositories
   - Up/Down arrows: scroll through logs
   - Page Up/Down: faster scrolling
   - Home/End (or g/G): jump to top/bottom
   - q: quit
4. Auto-scroll to bottom for new logs (unless user has scrolled up)
5. Show scroll indicator when scrolled up from bottom

## UI Layout

```
connected to dustbucket.com
 All | repo1 | repo2 | repo3
 [←→] select  [↑↓] scroll  [q] quit
────────────────────────────────────
[logs from selected repo or all]
```

## Implementation Notes

- Use raw ANSI codes (no TUI library) to align with minimal-dependencies goal
- Use alternate screen buffer for clean exit
- Handle terminal resize events
- Truncate long lines to terminal width (accounting for ANSI codes)
- Color each repo differently in the "All" view

## Testing

- Unit tests for ANSI rendering functions
- Test line truncation with ANSI codes
- Test scroll offset calculations

## Goals

- [Minimal Dependencies](../goals/minimal-dependencies.md)
- [Unit Test Coverage](../goals/unit-test-coverage.md)
- [Unsurprising UX](../goals/unsurprising-ux.md)

## Blocked By

(none)

## Definition of Done

- [ ] Terminal UI renders repository selector and logs
- [ ] Keyboard navigation works (select repo, scroll)
- [ ] "All" view shows multiplexed logs with colored prefixes
- [ ] Clean exit restores terminal state
- [ ] Unit tests cover rendering and input handling
