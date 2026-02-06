# Exploratory Testing

Exploratory tests validate dust workflows through multi-turn conversations, simulating how a developer uses dust via Claude Code.

## Setup

Create an isolated test directory with a dust binary wrapper:

```bash
DUST_BIN=$(realpath bin/dust)  # run from dust repo root
TEST_DIR=$(mktemp -d)
cd "$TEST_DIR"
git init

mkdir -p .dust bin
echo 'Always run `bin/dust agent` when starting work.' > CLAUDE.md

# Create dust wrapper pointing to the real binary
cat > bin/dust << EOF
#!/bin/bash
exec "$DUST_BIN" "\$@"
EOF
chmod +x bin/dust
```

## Running a Turn

Use `claude` with `-p` for print mode and `--output-format stream-json` to capture events:

```bash
claude -p "add a task to fix the login bug" \
  --output-format stream-json \
  --dangerously-skip-permissions \
  --max-turns 5
```

The output includes JSON events for tool uses, results, and text. The final `result` event contains `session_id`.

## Continuing the Conversation

Extract the `session_id` from the result event, then continue:

```bash
claude --continue \
  --session-id <session-id> \
  -p "actually, make it about the signup flow instead" \
  --output-format stream-json \
  --dangerously-skip-permissions \
  --max-turns 5
```

## What to Observe

During each turn, examine:

- **Tool uses**: What commands did Claude run? Look for `{"type":"tool_use",...}`
- **Bash commands**: Did Claude execute `bin/dust` correctly?
- **File operations**: What was created or modified in the test directory?
- **Context retention**: Does Claude remember previous turns?
- **Error handling**: How are failures communicated?

## Test Scenarios

### Workflow Discovery
Does Claude find and execute the right workflow when asked to perform a task?

### Multi-Step Tasks
Start a task, then provide feedback or request changes. Does Claude adapt?

### Error Recovery
Trigger a failure (missing file, invalid state). Does Claude diagnose and recover?

### State Changes
Make external changes to the test directory between turns. Does Claude notice?

## Converting Findings to [Evals](./evals.md)

When a behavior is worth preserving:

1. Identify the single turn that demonstrates it
2. Create an eval with that prompt and a setup.sh that recreates the conditions
3. Write an expectation focused on the essential behavior

Exploratory tests discover; evals preserve.
