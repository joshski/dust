# Stop up/down navigation from breaking text area input

The up/down keyboard bindings in `dust bucket` intercept arrow key input, breaking text area navigation in dialogs.

## Context

The `dust bucket` command connects to a dustbucket server via WebSocket and renders a terminal UI showing live logs from managed repositories. The terminal is set to raw mode to capture keyboard input for navigation.

### Current keyboard handling architecture

The keyboard system is implemented in `handleKeyInput()` in `lib/bucket/terminal-ui.ts`. Key bindings are defined as constants:

```typescript
export const KEYS = {
  UP: '\x1b[A',
  DOWN: '\x1b[B',
  RIGHT: '\x1b[C',
  LEFT: '\x1b[D',
  // ...
}
```

Up/down arrows scroll the log view, left/right switch between repository tabs.

### Raw mode setup

Raw mode is enabled globally on stdin in `lib/cli/commands/bucket.ts`:

```typescript
stdin.setRawMode(true)
stdin.resume()
stdin.setEncoding('utf8')

const handler = (key: string) => {
  onKey(key)  // ALL keys routed through handler
}
stdin.on('data', handler)
```

Once raw mode is enabled, all keyboard input is captured by the parent process and routed through `handleKeyInput()`, regardless of what child processes might be expecting to receive input.

### Agent status tracking

The system already tracks agent status in `RepositoryState`:

```typescript
agentStatus: 'idle' | 'busy'
```

This is updated when Claude events occur and synced to `TerminalUIState.agentStatuses`. The status is displayed as colored dots in the tab bar.

### The problem

When Claude Code is running and opens a dialog or text area input:

1. Raw mode remains active on the parent process's stdin
2. Arrow keys are intercepted by `handleKeyInput()` before reaching Claude
3. Up/down arrows scroll the log view instead of navigating within the text area
4. The user cannot use arrow keys for cursor navigation in input fields

This creates a poor user experience when interacting with Claude Code through the `dust bucket` interface.

## Proposal

Modify the keyboard handling system to only process navigation keys when the TUI is "in focus" — meaning no agent is actively running in the selected repository.

### Option 1: Use agent status to conditionally disable bindings

Check `agentStatuses.get(selectedRepo)` in `handleKeyInput()`. When the selected repository's agent is `'busy'`, pass through up/down keys instead of handling them.

### Option 2: Add explicit focus state

Introduce a `focusedComponent: 'tui' | 'agent'` field to `TerminalUIState`. Set it to `'agent'` when any agent is busy, `'tui'` otherwise. Disable navigation bindings when focus is on the agent.

### Option 3: Temporarily exit raw mode

When an agent starts, exit raw mode so the terminal behaves normally. Re-enter raw mode when the agent finishes. This would allow normal terminal input handling but may have side effects on the log display.

## Open Questions

### Which repositories' agent status should gate the bindings?

#### Only the selected repository

Disable bindings when the currently selected repository (visible tab) has `agentStatus === 'busy'`. This allows navigation to continue when viewing other repositories' logs while one repository has an active agent.

#### Any busy agent

Disable bindings whenever any repository has a busy agent. This is simpler but prevents TUI navigation entirely during any agent activity, which may be overly restrictive.

### What should happen in the "All" view?

The TUI has an "All" view (index -1) that merges logs from all repositories. There's no single repository selected.

#### Disable bindings if any agent is busy

In "All" view, check if any repository has a busy agent and disable bindings accordingly. This ensures input works when any agent needs it.

#### Never disable bindings in "All" view

Since no specific repository is selected, always allow TUI navigation. The user would need to switch to a specific repository tab to interact with that agent's input.

### Should we pass through all keys or just arrow keys?

#### Pass through only arrow keys

Only stop handling up/down arrows when an agent is busy. Other keys (like `q` to quit) still work. This maintains some TUI functionality during agent activity.

#### Pass through all keys

When an agent is busy, pass through all keyboard input. This ensures the agent receives everything it needs but means the user cannot control the TUI at all during agent activity.

### How should focus state be communicated to the user?

#### No explicit indication

The agent status dots already show when an agent is busy. Users would learn that navigation is disabled during agent activity.

#### Change the status line

Update the status bar to indicate that TUI navigation is disabled, e.g., show "Keys: agent" instead of the usual keyboard shortcuts.

#### Change the visual styling

Dim the tab bar or change colors to indicate the TUI is not accepting navigation input.

### Should there be a way to force TUI navigation?

#### No override

When an agent is busy, navigation is disabled, full stop. Simple and predictable.

#### Modifier key override

Allow navigation with a modifier key (e.g., Ctrl+Up/Down) even when an agent is busy. This provides an escape hatch but adds complexity.
