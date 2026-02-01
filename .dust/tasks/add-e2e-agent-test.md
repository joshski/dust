# Add End-to-End Agent Test

Implement a single end-to-end test in `./tests` that exercises the dust CLI through a simulated multi-turn agent session.

## Overview

The test should include an AI agent emulator that simulates how an AI agent interacts with dust through shell commands. Unlike unit tests that test individual commands in isolation, this test verifies the complete workflow of a multi-turn session.

## Implementation Details

### Shell Emulator

Create a shell emulator in `tests/shell-emulator.ts` that:
- Executes dust CLI commands directly (e.g., `bin/dust agent`, `bin/dust new task`)
- Captures stdout/stderr from each command
- Maintains state between commands (working directory, environment)
- Uses the in-memory file system emulator for isolation

### Agent Emulator

Create an agent emulator in `tests/agent-emulator.ts` that:
- Parses command output to determine next actions (simulating an AI agent reading instructions)
- Executes a predefined sequence of actions based on a test scenario
- Captures the full session transcript for assertions
- Throws errors when no handler matches (defensive behavior)

### Test Scenario

Keep the initial scenario simple:
1. Agent starts by running `bin/dust agent`
2. Parses output to understand it should run `bin/dust new task`
3. Runs the appropriate command
4. Continues the flow as directed until task creation is complete

### File Structure

```
tests/
  shell-emulator.ts      # Shell/CLI execution wrapper
  agent-emulator.ts      # Simulated agent that follows dust instructions
  add-task-session.e2e.test.ts  # The actual test file
```

### Technical Considerations

- Use vitest consistent with existing test patterns
- Use dependency injection to call main() directly with FileSystemEmulator
- Tests should be fast (in-memory, no subprocess spawning)

## Goals

- [Make Changes with Confidence](../goals/make-changes-with-confidence.md)
- [Agent Autonomy](../goals/agent-autonomy.md)
- [Fast Feedback](../goals/fast-feedback.md)

## Blocked by

(none)

## Definition of done

- [ ] Shell emulator can execute `bin/dust` commands and capture output
- [ ] Agent emulator can parse command output and determine next actions
- [ ] Test scenario successfully creates a task through multi-turn interaction
- [ ] Test passes when run with `npm run test` or `bun test`
- [ ] Tests use in-memory file system for isolation
