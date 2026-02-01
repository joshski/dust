# GitHub Actions Integration

The `dust github actions check` command is designed for CI environments. It runs all standard quality checks (`dust check`) and automatically creates periodic review tasks.

```bash
./bin/dust github actions check
```

## Periodic Review Task Creation

When running on the default branch (`main`) during a `push` event, the command creates `.dust/tasks/periodic-review.md` if:

1. The task file does not already exist
2. At least 20 commits have passed since the file was last deleted

The periodic review task instructs an agent to review the `.dust/` directory and create individual tasks for any maintenance needed (stale ideas, outdated facts, goals needing updates, etc.).

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
