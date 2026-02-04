# Periodic Health Check Hook

Trigger periodic dust health checks, prompting agents to create review tasks when maintenance is due.

## Design

- If a `.git` directory exists, dust automatically checks commits since last review
- Optional hook `.dust/hooks/health` for custom logic or non-git repos
- Warnings output as prescriptive instructions telling agents exactly what task to create

## Tracking completion via task history

Instead of a separate state file, the hook looks for when a specifically-named task (e.g., `.dust/tasks/dust-review.md`) was last deleted in git history.

The flow:
1. Hook checks git history for last deletion of `dust-review.md`
2. If N commits have passed since then, output a warning
3. Agent sees warning, creates `.dust/tasks/dust-review.md`
4. Agent completes the review, deletes the task
5. That deletion becomes the marker for the next cycle

## Example hook implementation

```bash
#!/bin/bash
TASK_FILE=".dust/tasks/dust-review.md"
THRESHOLD=50

LAST_DELETE=$(git log --diff-filter=D --format="%H" -1 -- "$TASK_FILE" 2>/dev/null)
if [ -z "$LAST_DELETE" ]; then
  COMMITS_SINCE=$(git rev-list --count HEAD 2>/dev/null || echo "0")
else
  COMMITS_SINCE=$(git rev-list --count ${LAST_DELETE}..HEAD 2>/dev/null || echo "0")
fi

if [ "$COMMITS_SINCE" -gt "$THRESHOLD" ]; then
  cat <<'EOF'
Action required: $COMMITS_SINCE commits since last dust review.

Instead of picking up a new task, create .dust/tasks/dust-review.md with:

# Dust Review

Review and maintain dust planning artifacts.

## Goals

- [Repository Hygiene](../goals/repository-hygiene.md)

## Blocked By

(none)

## Definition of Done

- [ ] Run `dust lint markdown` and fix any issues
- [ ] Review ideas in `.dust/ideas/` - promote, refine, or delete stale ones
- [ ] Verify facts in `.dust/facts/` still reflect the codebase
- [ ] Check goals in `.dust/goals/` are still relevant
EOF
fi
```

## Benefits

- Zero setup for git repos (automatic detection)
- Custom hook available for non-git repos or custom logic
- Uses existing task lifecycle patterns
- History visible in git log
- Generalizes to any periodic task
