# Terminal UI status indicator

Show a dot next to each repository tab in the `dust bucket` terminal UI to indicate whether an agent is currently active. A grey dot means idle; a green dot means an agent is busy.

## Context

The `dust bucket` terminal UI (`lib/bucket/terminal-ui.ts`) renders a row of tabs for navigating between repositories. Each tab shows the repository name, color-coded and optionally highlighted with inverse video when selected. The `renderTabs()` function builds these tabs and handles line wrapping when they exceed the terminal width.

### Agent lifecycle events

The agent loop in `lib/bucket/repository.ts` emits `AgentSessionEvent` values via the `onAgentEvent` callback:

- `agent-session-started` — emitted when an agent run begins
- `agent-session-ended` — emitted when an agent run finishes (with `success` and optional `error`)
- `agent-session-activity` — heartbeat emitted during an active run

These events are already flowing through the system: they are logged to each repository's `LogBuffer` and sent over WebSocket via `EventMessage`. This means the data needed to determine agent status is already available — it just isn't surfaced in the tab display.

### Current state model

`TerminalUIState` contains `repositories: string[]` (names) and `logBuffers: Map<string, LogBuffer>`, but has no concept of agent status. `RepositoryState` in `lib/bucket/repository.ts` tracks the loop promise and stop flag but also has no agent status field.

### Tab rendering

`renderTabs()` iterates over repository names and builds `{ text, width }` objects for each tab. The tab text includes ANSI color codes and the repository name. Adding a dot character would increase each tab's visible width by 2 (space + dot character).

## Proposal

1. Add an `agentStatus` field (e.g. `'idle' | 'busy'`) to `RepositoryState`
2. Set it to `'busy'` on `agent-session-started` and `'idle'` on `agent-session-ended`
3. Expose the status to the terminal UI, either via a new field on `TerminalUIState` (e.g. `agentStatuses: Map<string, 'idle' | 'busy'>`) or by passing `RepositoryState` references to the renderer
4. In `renderTabs()`, append a dot character (e.g. `●`) to each repository tab, colored grey (`ANSI.DIM`) for idle or green (`ANSI.FG_GREEN`) for busy
5. Account for the extra visible width when calculating tab wrapping

## Open Questions

### Where should the status dot appear within the tab?

#### After the repository name

Display as ` repo ● `. The dot appears at a consistent position relative to the name and is easy to scan visually.

#### Before the repository name

Display as ` ● repo `. Puts the status indicator first, which may be easier to notice at a glance, but is less conventional.

### How should agent status reach the terminal UI renderer?

#### Add a status map to TerminalUIState

Add `agentStatuses: Map<string, 'idle' | 'busy'>` to `TerminalUIState`. The bucket command would update this map when agent events arrive. This keeps the renderer decoupled from `RepositoryState` and follows the existing pattern where `TerminalUIState` carries only the data the renderer needs.

#### Pass RepositoryState to renderTabs

Give the renderer access to `RepositoryState` objects directly. More flexible but increases coupling between the UI layer and the state layer, which the current design intentionally avoids.

### What should the "All" tab show?

#### No dot on the "All" tab

The "All" tab merges logs from all repositories and doesn't correspond to a single agent. Showing no dot keeps it simple.

#### A composite indicator

Show a green dot if any repository has a busy agent, grey if all are idle. Gives a quick fleet-level status overview but adds complexity.

### Should there be more than two states?

#### Two states: idle and busy

Matches the original idea description. Simple and covers the primary use case.

#### Three or more states

Additional states like `syncing`, `sleeping`, or `error` could be shown with different colors (e.g. yellow for syncing, red for error). This would require tracking more lifecycle events (`loop.syncing`, `loop.no_tasks`, `agent-session-ended` with `success: false`) and choosing colors/symbols for each. More informative but more complex.

### Should the dot pulse or animate to show liveness?

#### Static dot

A simple solid dot that changes color. No animation. Keeps the rendering simple and avoids terminal flicker.

#### Animated indicator

Use a spinner or pulsing dot (e.g. alternating `●` and `○`) to show the agent is actively working, based on `agent-session-activity` heartbeats. Would require a render timer and adds visual complexity.
