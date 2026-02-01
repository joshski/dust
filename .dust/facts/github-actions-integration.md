# GitHub Actions Integration

The `dust github actions check` command is designed for CI environments. It runs all standard quality checks (`dust check`) and automatically creates periodic review tasks based on commit patterns.

```bash
./bin/dust github actions check
```

## Periodic Review Tasks

Each review type monitors commits to a specific path pattern and creates a dedicated task when the threshold is reached:

| Review Type | Task File | Monitors | Threshold |
|-------------|-----------|----------|-----------|
| Goals | `.dust/tasks/review-goals.md` | `.dust/goals/` | 20 commits |
| Ideas | `.dust/tasks/review-ideas.md` | `.dust/ideas/` | 20 commits |
| Facts | `.dust/tasks/review-facts.md` | `.dust/facts/` | 20 commits |

Each task is created independently when:
1. The task file does not already exist
2. At least N commits (threshold) have touched the monitored path since the task was last deleted

This pattern-based approach ensures focused reviews where each task gets the full attention of a single agent.

## GitHub Actions Environment Variables

The command uses these environment variables to detect the CI context:

- `GITHUB_REF_NAME` - The branch or tag name (must be `main`)
- `GITHUB_EVENT_NAME` - The event type (must be `push`, not `pull_request`)

When not in a GitHub Actions environment, the command behaves identically to `dust check`.

## CI Workflow Configuration

The CI workflow in `.github/workflows/ci.yml` uses this command:

```yaml
- name: Run quality checks
  run: ./bin/dust github actions check
```

## Related Commands

- `dust check` - Run quality checks without CI-specific features
- `dust lint markdown` - Lint `.dust/` markdown files
