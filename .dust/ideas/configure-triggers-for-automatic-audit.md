# Configure triggers for automatic audit

After either n commits, n tasks completed, or n lines of code changed, automatically schedule specific audits. This lets teams enforce regular review cadences tied to the pace of actual work rather than arbitrary calendar dates.

## How it works

A new `triggers` section in `.dust/config/settings.json` (or a dedicated `.dust/config/triggers.json`) maps thresholds to audit names. When an agent runs `dust next` or `dust pick task`, dust checks whether any trigger thresholds have been crossed since the audit was last completed. If so, dust creates the audit task automatically before the agent picks up other work.

Example configuration:

```json
{
  "triggers": [
    { "audit": "security-review", "every": { "commits": 100 } },
    { "audit": "test-coverage", "every": { "tasks": 20 } },
    { "audit": "dead-code", "every": { "linesChanged": 5000 } }
  ]
}
```

## Tracking when an audit last ran

Similar to the approach in the Periodic Health Check Hook idea, completion is tracked by looking at git history for when the corresponding audit task file (e.g., `.dust/tasks/audit-security-review.md`) was last deleted. This avoids introducing new state files.

## Counting thresholds

- **Commits**: count commits since the last deletion of the audit task file in git history.
- **Tasks completed**: count task file deletions in `.dust/tasks/` since the last audit completion.
- **Lines changed**: sum insertions and deletions from `git diff --stat` since the last audit completion.

## Open Questions

### Where should trigger configuration live?

#### In settings.json under a "triggers" key

Keeps all configuration in one place. Simpler for small projects.

#### In a dedicated .dust/config/triggers.json file

Separates concerns and avoids bloating the main settings file. Easier to manage when there are many triggers.

### Should triggers block the agent from picking other work?

#### Yes, audit tasks should be highest priority

When a trigger fires, the audit task is created and the agent must work on it before anything else. This guarantees audits are never skipped.

#### No, audit tasks should be added to the backlog normally

The audit task is created but competes with other tasks for priority. Agents may defer it if higher-priority work exists. Audits could be postponed indefinitely.

#### Configurable per trigger

Each trigger specifies whether its audit is blocking or just added to the backlog. This gives teams fine-grained control.

### Should multiple threshold types be combinable with AND/OR logic?

#### No, keep it simple with single thresholds per trigger

Each trigger watches exactly one metric. If you want both commits and lines-changed triggers for the same audit, create two separate trigger entries. Simpler to understand and implement.

#### Yes, support compound triggers

Allow triggers like `{ "audit": "security-review", "every": { "commits": 50, "linesChanged": 2000 }, "match": "any" }` where `match` is `"any"` (OR) or `"all"` (AND). More expressive but adds complexity.
