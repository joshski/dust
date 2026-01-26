# Single Quality Gate Command

A single command that runs all quality gates for the dust repository.

## Goals

- [Make Changes with Confidence](../goals/make-changes-with-confidence.md)
- [Fast Feedback](../goals/fast-feedback.md)
- [Agent Agnostic](../goals/agent-agnostic.md)

## Notes

Agents should run this command before and after executing any work:

- **Before work**: Establishes a baseline. Any quality drops after this point are attributable to the changes being made.
- **After work**: Ensures the repository is left in a clean state, ready for subsequent work to begin immediately.

This command should run all checks: tests, type checking, linting, coverage thresholds, and any other quality gates. It should be fast enough to run frequently and produce clear, actionable output on failure.
