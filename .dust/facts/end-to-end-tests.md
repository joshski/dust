# End-to-End Tests

End-to-end tests validate dust workflows by simulating multi-turn agent sessions. Test files live in `tests/` with support code in `tests/support/`. Other projects sometimes call these "e2e tests" or "system tests".

## Architecture

The testing framework has three layers:

1. **Shell Emulator** (`tests/support/shell-emulator.ts`) - Executes dust CLI commands using an in-memory file system. Calls the dust `main()` function directly instead of spawning subprocesses, making tests fast and isolated.

2. **Agent Emulator** (`tests/support/agent-emulator.ts`) - Simulates an AI agent by using pattern-based handlers to determine the next command based on command output. Handlers match regex patterns against stdout/stderr and return the next command (or null to stop).

3. **Content Builders** (`tests/support/content-builders.ts`) - Helper functions (`buildTask`, `buildGoal`, `buildIdea`, `buildFact`) that generate properly formatted markdown content for test fixtures.

## Key Concepts

- **runSession()** - Main entry point for running multi-turn test sessions (`tests/support/run-session.ts`)
- **FileSystemTree** - Object structure representing the virtual file system
- **ActionHandler** - Maps output patterns to next commands
- **NoHandlerMatchError** - Thrown when no handler matches (helps debug missing handlers)
- Sessions always start with `bin/dust agent` command
