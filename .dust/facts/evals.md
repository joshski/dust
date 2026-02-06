# Evals

The eval framework tests whether AI agents respond correctly to prompts when working in a dust project. It's used to validate changes to agent prompts and workflows.

## Running Evals

```bash
bun run eval <eval-name>
```

Example:
```bash
bun run eval add-task-from-prompt
```

## Creating an Eval

Each eval lives in its own directory under `evals/` and requires two files:

### eval.json
Defines the prompt and expected behavior:
```json
{
  "prompt": "add a task to fix the login bug",
  "expectation": "Agent should run the 'new task' workflow by executing a command containing 'bin/dust agent new task'"
}
```

### setup.sh
Creates an isolated test environment. The script receives two environment variables:
- `DUST_BIN` - Path to the dust binary
- `TEST_DIR` - Path to the temporary test directory

The setup script should:
1. Initialize a git repository (required by dust)
2. Create the `.dust/` directory structure
3. Create a `CLAUDE.md` file with instructions
4. Create a `bin/dust` wrapper that calls the actual dust binary

## How It Works

1. The runner creates a temporary directory and runs `setup.sh`
2. Claude Code is spawned with the prompt in that directory
3. All events (tool uses, text, results) are collected
4. Haiku evaluates whether the agent's behavior matched the expectation
5. The temporary directory is cleaned up
6. Pass/fail result is reported

## Design Principles

- **Isolation**: Each eval runs in a fresh temporary directory
- **Semantic evaluation**: Haiku judges behavior by intent, not exact string matching
- **Extensibility**: Add new evals by creating a new directory with `eval.json` and `setup.sh`

Use [Exploratory Testing](./exploratory-testing.md) to discover behaviors worth preserving as evals.
