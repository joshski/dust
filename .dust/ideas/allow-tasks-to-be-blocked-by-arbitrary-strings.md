# Allow tasks to be blocked by arbitrary strings

Currently, the `## Blocked By` section in task files only accepts markdown links to other task files. A task becomes unblocked when the referenced file is deleted. This works well for task-to-task dependencies but cannot express blockers that live outside the task system — waiting on a third-party API, a decision from a stakeholder, an external event, or any condition that doesn't map to a dust task file.

Allowing arbitrary strings as blockers would let tasks express these external dependencies directly. A `## Blocked By` section could contain a mix of task links and plain-text strings like "Waiting for API v2 release" or "CI pipeline supports Node 22".

String blockers (lines that are not markdown links to `.md` files) would always be considered unresolved, since there is no file to delete. A human or agent would need to manually remove the string from the `## Blocked By` section to unblock the task.

This keeps the existing file-based blocking mechanism intact while adding a lightweight way to document non-task dependencies. Tasks with string blockers would not appear in `dust next` until those strings are removed.

## Open Questions

### How should string blockers be resolved?

#### Manual removal only

A human or agent deletes the string from the `## Blocked By` section when the condition is met. This is the simplest approach and requires no new commands or tracking. The downside is that there is no record that the blocker existed once it is removed.

#### A command like `dust unblock`

A dedicated command that lists string blockers across all tasks and lets the user mark them as resolved (removing them from the file). This adds discoverability — you can see all external blockers at a glance — but adds implementation effort for a potentially infrequent operation.

### Should string blockers be validated or linted?

#### No validation

Any non-empty string is accepted. This is maximally flexible but could lead to inconsistent or unclear blocker descriptions.

#### Warn on very short or vague strings

The linter could flag string blockers that are too short (e.g., fewer than 10 characters) or match vague patterns like "TBD" or "TODO". This encourages meaningful descriptions without blocking legitimate use.
