# Remove principles validation

Update outdated references to principles being required in task files.

## Context

The `## Principles` section in task files was made optional. The `task-file-format.md` fact correctly documents this:

> - `## Principles` - Links to principle documents this task supports (optional)

The validators have already caught up with this change. In `content-validator.ts:8`, `REQUIRED_HEADINGS` only contains `'## Blocked By'` and `'## Definition of Done'`. The `validateSemanticLinks` function in `link-validator.ts` validates that links within a `## Principles` section point to principle files *if the section exists*, but does not require the section.

However, there are outdated references elsewhere:

1. **`capture-complexity-estimate-in-tasks.md`** (line 11) states: "The existing task file format (defined in [`.dust/facts/task-file-format.md`](../facts/task-file-format.md)) requires three sections: `## Principles`, `## Blocked By`, and `## Definition of Done`." This is incorrect - principles is optional.

2. **Workflow task templates** in `workflow-tasks.ts:343` include "Task's Principles section links to relevant principles from .dust/principles/" as a suggested Definition of Done item for decompose idea tasks. This is guidance rather than a requirement, but it could be reconsidered for consistency.

## Proposed Changes

Update the outdated idea file to reflect that principles is now optional. The workflow template's Definition of Done suggestion could remain as guidance, since linking principles when relevant is still a good practice.

## Open Questions

### Should the workflow template's Definition of Done item about principles be updated?

#### Keep as guidance (Recommended)

The current wording encourages linking relevant principles, which is valuable when principles exist. The word "relevant" already implies it's not mandatory for every task. No change needed.

#### Make it explicitly optional

Rephrase to "If applicable, Task's Principles section links to relevant principles" to make the optional nature clearer. This adds verbosity but removes any ambiguity.

#### Remove entirely

Remove the principles Definition of Done item since principles linking is optional. This simplifies the template but loses the nudge toward good practice.
