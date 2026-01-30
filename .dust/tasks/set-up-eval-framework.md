# Set up eval framework for agent prompts

Create an evaluation framework to test whether different prompts and prompt configurations lead agents to take the correct action in response to user requests.

## Context

The `lib/templates/agent-greeting.txt` template guides agents to select the correct dust command based on terse user input. We need a systematic way to evaluate whether changes to this prompt (or how it's exposed) improve or degrade agent behavior.

## Requirements

1. **Isolated test directories**: Evals must run against completely separate working directories from the dust source code. This ensures:
   - No pollution from the dust repo's `.git` directory
   - No interference from `.dust` directory state
   - Complete control over the repository state being tested

2. **Deterministic execution**: Results should be reasonably deterministic across runs. Consider:
   - Setting temperature to 0 or using seed parameters if available
   - Using the same model version
   - Controlling for any randomness in the test setup

3. **Framework design**:
   - A way to define eval cases (user prompt + expected action/outcome)
   - A way to set up test directories with specific state (e.g., with/without existing tasks, goals, etc.)
   - A way to run Claude Code in unattended mode against the test directory
   - A way to verify the outcome (e.g., which command was run, what files were created)
   - Reporting on pass/fail rates across multiple runs

4. **First eval**: Design a simple first eval case that tests whether a user saying "add a task to fix the login bug" results in the agent running `bin/dust agent new task`.

## Technical approach

### Directory setup
Each eval is a directory containing:
- `setup.sh` - Bash script that creates the isolated test directory with required state (git history, files, .dust contents, etc.)
- `eval.json` - Defines the user prompt and evaluation criteria

### Execution
1. Run `setup.sh` to create isolated test directory (e.g., in `/tmp/dust-eval-xxx/`)
2. Run agent via `lib/claude/spawn-claude-code.ts` with:
   - `cwd` pointing to test directory
   - `dangerouslySkipPermissions: true`
   - Collect all events (especially `ToolUseEvent` for commands run)
3. Send collected transcript to Haiku with evaluation prompt
4. Haiku determines pass/fail based on whether agent behavior matched expectations
5. Report results

### Why Haiku for evaluation
Using a separate Claude session (Haiku) to judge outcomes allows flexible evaluation criteria without brittle string matching. The evaluator can understand intent rather than requiring exact command matches.

## Goals

- [Agent Context Inference](../goals/agent-context-inference.md)
- [Make Changes with Confidence](../goals/make-changes-with-confidence.md)

## Blocked by

(none)

## Definition of done

- [ ] Eval framework can create isolated test directories with controlled state
- [ ] Eval framework can run Claude Code against a test directory with a given prompt
- [ ] Eval framework can capture what action the agent took
- [ ] Eval framework can compare actual vs expected outcomes
- [ ] At least one working eval case exists and passes
- [ ] Running evals is documented (e.g., `bin/dust eval` or similar)
