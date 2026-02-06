# Catch mistakes in commit history

The workflow depends on discipline to prevent duplication of effort. For example, tasks are supposed to be deleted in atomic commits. But there is no guarantee that will happen.

It may be possible to detect suspicious changes in git history and prompt an agent to resolve any issues.

## Problem

Dust's workflow relies on conventions that are easy to violate:

- A completed task file should be deleted in the same commit that implements the work. But an agent might implement the work in one commit and forget to delete the task file, or delete the file in a separate commit, losing the atomic association.
- Two agents might both implement the same task if claims aren't coordinated, resulting in duplicate work that's hard to detect after the fact.
- An agent might accidentally delete a task file without implementing the work (e.g. during a rebase or conflict resolution).
- Facts or goals might be silently modified or deleted without any corresponding task justifying the change.
- A task's "Definition of Done" criteria might not actually be satisfied by the implementing commit, but the task file gets deleted anyway.

These mistakes are invisible during normal operation because `dust check` and `dust lint markdown` only validate the current state of the `.dust/` directory — they don't look at history.

## Concept

A `dust audit` command that scans recent git history for suspicious patterns and reports violations. It would run as a quality gate (like `dust check`) or on-demand.

## Suspicious patterns to detect

### Orphaned task deletions
A task file was deleted in a commit that contains no other changes. This suggests the task was removed without being implemented — either accidentally or as cleanup that should have been a deliberate action.

### Split-commit task completion
A task file was deleted in a different commit from the one that implements the work. The implementation and the cleanup should be atomic. Detection: find commits that delete `.dust/tasks/*.md` files and check whether the same commit also modifies source files.

### Ghost implementations
Source files were changed in a commit whose message references a task, but the task file still exists. This might mean the agent forgot to delete the task, or the work was partial and the task should have been updated rather than left as-is.

### Unauthorized .dust/ modifications
Files in `.dust/goals/` or `.dust/facts/` were modified without a corresponding task in the commit message. Goals and facts should change deliberately, not as side effects.

### Duplicate task implementations
Two different commits both reference the same task. This could indicate two agents worked on the same task (a coordination failure) or that the task was partially implemented and then completed later.

## Possible commands

- `dust audit` — scan the last N commits (default: 50) and report violations
- `dust audit --since <commit>` — audit from a specific point in history
- `dust audit --fix` — for each violation found, create a task to resolve it

## Integration points

- Could run as a `dust check` step, failing the quality gate if violations are found
- Could run as part of `dust loop claude` between iterations
- Could be a pre-push hook that warns about suspicious patterns before pushing
- Results could be broadcast via the event protocol

## Open Questions

### How strict should the audit be — warnings or errors?

#### Strict mode: violations fail the quality gate

Any detected pattern violation causes `dust audit` to return a non-zero exit code, blocking pushes or loop iterations. This enforces discipline but may produce false positives that frustrate agents and humans. For example, a task file might legitimately be deleted in a cleanup commit if the work was done in a previous session. Strict mode works well for teams that want rigorous process but requires tuning to avoid noise.

#### Advisory mode: violations are reported but don't block

`dust audit` prints warnings but always exits 0. This is informational — humans and agents see the issues but aren't forced to act. It's appropriate for adoption (start with visibility, add enforcement later) but risks being ignored if no one reads the output. Integrating with event broadcasting could make advisory output more visible.

#### Configurable severity per pattern

Each pattern has a configurable severity (error, warning, ignore) in `.dust/config/settings.json`. Teams tune the audit to their workflow — e.g. treat orphaned task deletions as errors but split-commit completions as warnings. This is the most flexible but adds configuration surface and forces teams to make up-front decisions about patterns they may not yet have opinions on.

### How should the audit identify the "implementing commit" for a task?

#### Convention: commit message must reference task slug

The audit expects commit messages to include the task filename (e.g. `implement-auth-flow`) somewhere in the message. This is simple to implement and easy for agents to follow (they already know the task name). The limitation is that it depends on naming discipline — if an agent writes a creative commit message that doesn't include the slug, the audit can't link the commit to the task.

#### Heuristic: match commits by time and file overlap

The audit uses proximity heuristics — a commit that modifies source files near the time a task file was deleted is likely the implementing commit. This doesn't require commit message conventions but is fuzzy and unreliable for repos with high commit velocity where multiple tasks complete in quick succession.

#### Explicit: task file records its implementing commit SHA

When an agent completes a task, it writes the commit SHA into the task file before deleting it in the next commit. The audit reads the SHA from the deleted file's git history to establish the link. This is precise but introduces a two-commit workflow (write SHA, then delete file) that contradicts the goal of atomic task completion.

### Should the audit be able to auto-fix violations?

#### No auto-fix, only report

The audit reports violations and leaves resolution to humans or agents. This is the safest approach — automated fixes to git history are dangerous (rewriting history, force-pushing). The cost is that violations accumulate if no one acts on them.

#### Generate tasks for each violation

The audit creates new task files in `.dust/tasks/` describing each violation and how to resolve it. An agent picks up these tasks in the normal workflow. This keeps the loop self-healing without rewriting history. The risk is task proliferation — a messy commit history could generate dozens of cleanup tasks that crowd out real work.

#### Auto-fix where safe, generate tasks for the rest

Some violations have safe, mechanical fixes (e.g. deleting an orphaned task file that was already implemented). The audit applies these directly and generates tasks for violations that require judgment. This is pragmatic but requires careful classification of what's "safe" — an incorrect auto-fix could delete a task that wasn't actually done.
