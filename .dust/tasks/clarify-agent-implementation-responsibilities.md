# Clarify Agent Implementation Responsibilities

Update `lib/templates/agent-tasks.txt` to be explicit about what an agent should do when implementing a task.

## Goals

- [Atomic Commits](../goals/atomic-commits.md) - Ensuring task deletion is part of the implementation commit
- [Make Changes with Confidence](../goals/make-changes-with-confidence.md) - Running checks before and after changes
- [Fast Feedback](../goals/fast-feedback.md) - Catching issues early with pre-implementation checks

## Blocked by

(none)

## Definition of done

- [ ] Add a section to `lib/templates/agent-tasks.txt` explaining agent responsibilities when implementing a task
- [ ] Include instruction to install dependencies first
- [ ] Include instruction to run `dust check` before implementing anything
- [ ] Include instruction to run `dust check` after implementing all changes
- [ ] Include instruction to make a single atomic commit that includes deleting the task file(s)
