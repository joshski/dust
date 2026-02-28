# Agent Settings Page

Replace the per-repository tab selection in `dust bucket` with a dedicated settings page that provides a unified view for repository configuration.

## Motivation

The current `dust bucket` TUI displays repositories as horizontal tabs (`terminal-ui.ts` lines 400-448). While this works for viewing logs, it doesn't scale well for:

- **Configuration**: Users can't configure per-repository settings like git protocol (SSH vs HTTPS)
- **Batch operations**: There's no way to perform actions on multiple repositories at once
- **Discoverability**: The tab bar becomes unwieldy with many repositories

A settings page would provide a table-based view where repositories are rows, enabling both configuration and batch operations.

## Current Implementation

The TUI currently uses:

- `TerminalUIState.selectedIndex` to track which repository tab is selected (-1 = "All", 0+ = specific repo)
- `renderTabs()` to draw the tab bar with status dots
- `handleKeyInput()` for LEFT/RIGHT navigation between tabs
- `renderFrame()` to compose the full screen with tabs, logs, and help line

Repository data comes from the dustbucket server via the `repository-list` WebSocket message, which provides: `name`, `gitUrl`, `url`, `id`, and `hasTask`.

## Proposed Behaviour

Pressing a key (e.g., `s` for settings) would navigate to a settings page that:

1. Shows repositories in a table with columns: checkbox, name, git protocol, agent status
2. Highlights the current repository at the top with a distinct background colour
3. Hides the log area and tab bar while on this page
4. Supports keyboard navigation: UP/DOWN to select rows, SPACE to toggle checkboxes
5. Enables batch operations on checked rows (e.g., remove from list, change protocol)
6. Returns to the log view with ESC or `s` again

## Open Questions

### Should this be a TUI page or a web page?

#### TUI page within dust bucket

Add a new mode to the existing terminal UI in `dust bucket`. User presses a key to enter settings mode, navigates with keyboard, presses ESC to return. Keeps everything in the terminal, no new infrastructure needed.

#### Web page on dustbucket.com

Create a settings page at `https://dustbucket.com/settings` or similar. This would be "addressable by URL" as mentioned in the original idea. Requires server-side web development but provides a richer UI and is accessible from any browser.

#### Both: TUI for quick access, web for full configuration

The TUI provides a read-only view or minimal configuration, while the web interface offers complete settings management. More work but covers both use cases.

### How should git protocol preference be stored?

#### Store preference locally in ~/.dust/config/bucket-settings.json

The server currently provides `gitUrl` which is already either SSH or HTTPS format. To support per-repository protocol override, the client would rewrite the `gitUrl` before cloning based on the stored preference. Simple to implement but preferences don't roam between machines.

#### Store preference on the dustbucket server

Server includes a `preferredProtocol` field in `repository-list` messages and accepts updates via a new message type. Preferences roam automatically but requires server-side changes.

### Should the settings page be a separate "mode" or overlay?

#### Separate mode that replaces the log view entirely

Clear visual distinction, simpler state management. User can't see logs while configuring. Similar to how vim has normal/insert/visual modes.

#### Overlay that dims the log view behind it

User retains context of what's happening. More complex rendering and state management.

### What batch operations should be supported initially?

#### Just protocol switching

Minimal scope - let users select multiple repos and change them all to SSH or HTTPS. Proves the batch selection pattern before adding more operations.

#### Protocol switching plus remove from list

Also allow removing checked repositories from the local workspace. Useful for cleaning up repos no longer needed.

### How should the current repository be determined?

#### Use the working directory if it matches a known repository

The task mentions highlighting the "current repository" at the top. Since dust bucket clones repositories into `~/.dust/repositories/` which is separate from where the user invokes `dust bucket`, "current" could mean the repo matching the working directory.

#### Always treat "All" as current, don't highlight any single repo

Since dust bucket manages all repos equally, there's no inherent "current" repo. Skip the highlighting feature.

#### Allow the user to pin a "primary" repository

Let users mark one repo as primary via a keybinding. This persists and that repo sorts first.
