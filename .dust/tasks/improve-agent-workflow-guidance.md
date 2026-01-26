# Improve agent workflow guidance

Update the `dust help` text (in `lib/cli/main.ts`) to provide clearer guidance for agents on the quality gate workflow and task cleanup process.

## Changes needed

Add the following instructions to the "Working on Tasks" section:

1. **Run `dust check` before starting work** - Agents should verify the project is in a good state before making changes
2. **Run `dust check` before committing** - Ensure all quality gates pass before creating a commit

Add to the "Completing a Task" section:

3. **Update references to the completed task** - When deleting a task file, also update any other tasks that reference it in their "Blocked by" sections (remove the reference or update to "(none)" if it was the only blocker)

## Goals

- [Fast Feedback](../goals/fast-feedback.md)
- [Make Changes with Confidence](../goals/make-changes-with-confidence.md)
- [Repository Hygiene](../goals/repository-hygiene.md)

## Blocked by

(none)

## Definition of done

- The "Working on Tasks" section instructs agents to run `dust check` before starting work
- The "Completing a Task" section instructs agents to run `dust check` before committing
- The "Completing a Task" section instructs agents to update "Blocked by" references in other tasks when deleting a completed task
