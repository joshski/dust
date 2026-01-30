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

## Technical considerations

- May need to use `claude --dangerously-skip-permissions` or similar for unattended execution
- Need to capture what commands the agent ran (possibly via hooks or log parsing)
- Consider whether to use actual Claude API calls or mock responses for initial framework setup
- The eval framework itself should be testable without making API calls

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
