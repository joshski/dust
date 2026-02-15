# Add keyboard shortcut to open repo URL in browser

Add a keyboard shortcut (`o`) to the `dust bucket` terminal UI that opens the currently selected repository's web URL in the default browser.

## Implementation

1. Add an optional `url?: string` field to the `Repository` interface in `lib/bucket/repository.ts`
2. Update `parseRepository()` to extract and validate the `url` field from server messages
3. Add a `repositoryUrls: Map<string, string>` field to `TerminalUIState` to store URLs accessible to the keyboard handler
4. Update `addRepository()` in `terminal-ui.ts` to accept and store the URL
5. Add an `o` key handler in `handleKeyInput()` that:
   - Does nothing if `selectedIndex === -1` (the "All" tab)
   - Does nothing if the selected repository has no URL
   - Otherwise opens the URL in the browser using the existing `openBrowser` pattern
6. Update `renderHelpLine()` to include `[o] open` in the shortcut list
7. Thread the `openBrowser` function through to the keyboard handler (likely via a new optional callback parameter)

## Goals

- [Unsurprising UX](../goals/unsurprising-ux.md)
- [Fast Feedback](../goals/fast-feedback.md)

## Blocked By

(none)

## Definition of Done

- [ ] `Repository` interface has an optional `url?: string` field
- [ ] `parseRepository()` extracts the `url` field when present
- [ ] `TerminalUIState` has a `repositoryUrls` map storing URLs by repository name
- [ ] Pressing `o` on a repository tab opens its URL in the default browser
- [ ] Pressing `o` on the "All" tab does nothing
- [ ] Pressing `o` on a repository without a URL does nothing
- [ ] Help line shows `[o] open` shortcut
- [ ] Tests cover the new keyboard shortcut behavior
