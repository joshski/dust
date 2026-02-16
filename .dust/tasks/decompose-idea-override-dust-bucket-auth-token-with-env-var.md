# Decompose Idea: Override dust bucket auth token with env var

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Review `.dust/goals/` to link relevant goals and `.dust/facts/` for design decisions that should inform the task. See [Override dust bucket auth token with env var](../ideas/override-dust-bucket-auth-token-with-env-var.md).

Remove the CLI argument as a way of specifying the token

## Resolved Questions

### Should the environment variable take precedence over stored credentials, or vice versa?

**Decision:** Environment variable wins over stored credential (recommended)

### Should we log or indicate which token source was used?

**Decision:** No, keep it silent

### Should an empty string value of DUST_BUCKET_TOKEN be treated as unset?

**Decision:** Yes, treat empty string as unset (recommended)


## Goals

(none)

## Blocked By

(none)

## Definition of Done

- [ ] One or more new tasks are created in .dust/tasks/
- [ ] Task's Goals section links to relevant goals from .dust/goals/
- [ ] The original idea is deleted or updated to reflect remaining scope
