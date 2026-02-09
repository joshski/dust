# dust up

A single command that takes a list of git repository URLs and runs `dust loop claude` across all of them indefinitely.

## Usage

```bash
dust up https://github.com/joshski/dust.git https://github.com/joshski/dustbucket.git
```

## Behavior

1. For each URL, clone the repo (or pull if already cloned) into a managed workspace
2. Spawn a `dust loop claude` process for each repo
3. Keep running indefinitely (no max iterations by default)
4. Multiplex output so the user can see what's happening across all repos
5. On SIGINT/SIGTERM, clean up all child processes

## Design decisions

- No config file needed for the first version — repos are passed as CLI arguments
- Repos are cloned to a local workspace directory (e.g. `~/.dust/workspaces/` or a temp directory)
- Each repo runs its own independent dust loop — no cross-repo coordination
- Events from all repos are posted to `eventsUrl` if configured, enabling dustbucket to show a unified view

## Open questions

### Where should repos be cloned?

#### Managed workspace directory

Clone to `~/.dust/workspaces/{repo-name}`. Persistent across runs, fast on subsequent starts since the clone already exists. Risk of stale state if the user also works on these repos manually.

#### Temporary directory per session

Clone fresh each time. Clean state guaranteed, but slower startup and wastes bandwidth.

### How should output be displayed?

#### Prefixed interleaved output

Each line prefixed with the repo name, like `[dust] Running task...` and `[dustbucket] Running task...`. Simple, works in any terminal.

#### Quiet by default, rely on dustbucket for visibility

Minimal terminal output (just status changes), with full detail available in dustbucket via events. Cleaner terminal but requires dustbucket for real visibility.
