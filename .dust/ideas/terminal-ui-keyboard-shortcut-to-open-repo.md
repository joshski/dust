# Terminal UI keyboard shortcut to open repo

Pressing `o` in the `dust bucket` terminal UI should open the current repository's web URL in a browser.

## Context

The `dust bucket` command connects to a dustbucket server via WebSocket, receives a `repository-list` message, and renders a terminal UI showing live logs from all managed repositories. Users can navigate between repositories using arrow keys.

### Current keyboard shortcuts

The TUI handles keyboard input in `handleKeyInput()` in `lib/bucket/terminal-ui.ts`. Current shortcuts include arrow keys for navigation, `PgUp`/`PgDn` for paging, `g`/`G` for top/bottom, and `q` to quit. The `o` key is not currently bound to any action.

### Repository data model

The `Repository` interface in `lib/bucket/repository.ts` currently has two fields:

- `name: string` — display name for the repository
- `gitUrl: string` — the Git clone URL

There is no field for the repository's web URL. The task description says the web URL should be "passed in the feed of repositories (separately from the repository Git URL)," meaning a new field would be added to the `Repository` interface and sent by the dustbucket server.

### Browser opening infrastructure

The codebase already has browser-opening logic in the auth module (`lib/bucket/auth.ts`), used for the OAuth flow. This uses platform-appropriate commands (`open` on macOS, `xdg-open` on Linux). This infrastructure could be reused.

### State threading

The keyboard handler receives `TerminalUIState`, which contains repository names and the selected index, but does not currently have access to `Repository` objects (which live in `BucketState.repositories`). The handler would need access to repository URLs — either by threading `BucketState` through to the handler, or by storing URLs in `TerminalUIState`.

## Proposal

1. Add a `url?: string` field to the `Repository` interface
2. Update `parseRepository()` to accept and validate the new field from the server feed
3. Store repository URLs in a structure accessible to the keyboard handler
4. Add an `o` key handler that opens the current repository's web URL in the default browser
5. Update the help line to include `[o] open`

## Open Questions

### How should the repository URL reach the keyboard handler?

#### Add a URL map to TerminalUIState

Store a `Map<string, string>` mapping repository names to web URLs directly in `TerminalUIState`. This keeps the keyboard handler's interface unchanged and avoids threading `BucketState` through the input path.

#### Pass BucketState to the keyboard handler

Give the handler access to the full `BucketState`, which already contains `RepositoryState` objects. This is more flexible but increases coupling between the UI layer and the state layer.

### What should happen when no URL is available?

#### Silently ignore the keypress

If the selected repository has no `url` field, pressing `o` does nothing. Simple but gives no feedback.

#### Show a brief message in the UI

Display a transient message like "No URL available for this repository" in the log area or status line. More helpful but requires a message display mechanism.

### What should `o` do when the "All" tab is selected?

The TUI has an implicit "all repositories" view (index -1) that merges logs from all repositories. There's no single repository selected in this view.

#### Ignore the keypress in "All" view

Pressing `o` does nothing when viewing all repositories. Consistent with the idea that `o` acts on the "current" repository.

#### Open the URL of the most recently active repository

Use the last repository that emitted a log line. This could be surprising if the user didn't notice which repository was last active.

### Should the URL field be required or optional?

#### Optional (`url?: string`)

Repositories without a web URL still work normally — the `o` shortcut is simply unavailable for them. This is backwards-compatible with existing server feeds that don't include the field.

#### Required (`url: string`)

Every repository in the feed must have a web URL. Simpler to reason about but breaks backwards compatibility if existing feeds don't include it.

### Should there be user feedback after pressing `o`?

#### No feedback — just open the browser

Keeps the UI clean. The browser opening is its own confirmation. This matches how most terminal tools handle "open in browser" shortcuts (e.g., `gh browse`).

#### Show a transient status message

Display "Opening <url>..." briefly in the status area. Useful if the browser takes a moment to open or if the user wants to confirm what URL was opened.
