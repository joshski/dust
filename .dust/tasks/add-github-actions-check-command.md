# Add GitHub Actions Check Command

Create a new `dust github actions check` command that extends `dust check` with periodic health check task creation for CI environments.

## Overview

When running in GitHub Actions on the default branch, the command should automatically create a health check task after every 20 commits (measured from when the task was last deleted). This ensures regular maintenance reviews happen without manual intervention.

## Implementation Details

### New Command: `dust github actions check`

Create `lib/cli/commands/github-actions-check.ts` that:

1. Runs all checks from `dust check` (reuse the existing `check` function from `lib/cli/commands/check.ts`)
2. After checks pass, performs the health check task creation logic

### Health Check Task Creation Logic

The command should create `.dust/tasks/periodic-health-check.md` when ALL of these conditions are met:

1. **Running on default branch**: Use GitHub Actions environment variables:
   - `GITHUB_REF_NAME` equals the default branch
   - `GITHUB_EVENT_NAME` is `push` (not PR)
   - Can detect default branch via `GITHUB_REF_NAME === 'main'` or check the repository's default branch

2. **Task file does not exist**: `.dust/tasks/periodic-health-check.md` is not present

3. **20+ commits since task was deleted**: Count commits since the task file was last deleted in git history:
   ```bash
   # Find the commit where the file was last deleted
   LAST_DELETE=$(git log --diff-filter=D --format="%H" -1 -- ".dust/tasks/periodic-health-check.md")

   # Count commits since that deletion (or all commits if never deleted)
   if [ -z "$LAST_DELETE" ]; then
     COMMITS_SINCE=$(git rev-list --count HEAD)
   else
     COMMITS_SINCE=$(git rev-list --count ${LAST_DELETE}..HEAD)
   fi
   ```

### Pre-defined Health Check Task Content

When conditions are met, create `.dust/tasks/periodic-health-check.md` with this content:

```markdown
# Periodic Health Check

Review and maintain dust planning artifacts to ensure the `.dust/` directory stays relevant and useful.

## Goals

- [Repository Hygiene](../goals/repository-hygiene.md)

## Blocked by

(none)

## Definition of done

- [ ] Run `dust lint markdown` and fix any issues
- [ ] Review ideas in `.dust/ideas/` - promote actionable ones to tasks, refine unclear ones, delete stale ones
- [ ] Verify facts in `.dust/facts/` still reflect the current codebase
- [ ] Check goals in `.dust/goals/` are still relevant and properly linked
- [ ] Delete this task file when complete (deletion marks the start of the next 20-commit cycle)
```

### Git Commit

When creating the task file, the command should:

1. Stage the new file: `git add .dust/tasks/periodic-health-check.md`
2. Commit with message: `Add task: Periodic Health Check`
3. Push to the branch (GitHub Actions has write access)

### Integration with CI Workflow

Update `.github/workflows/ci.yml` to use the new command:

```yaml
- name: Run quality checks
  run: ./bin/dust github actions check
```

### Command Registry

Add the new command to `lib/cli/main.ts`:

```typescript
'github actions check': githubActionsCheck,
```

### Error Handling

- If git operations fail, log a warning but don't fail the overall check
- If not in GitHub Actions environment (missing env vars), behave exactly like `dust check`
- If on a non-default branch, behave exactly like `dust check`

## Goals

- [Repository Hygiene](../goals/repository-hygiene.md)
- [Agent Autonomy](../goals/agent-autonomy.md)

## Blocked by

(none)

## Definition of done

- [ ] `lib/cli/commands/github-actions-check.ts` created with full implementation
- [ ] `lib/cli/commands/github-actions-check.test.ts` created with tests for:
  - [ ] Runs all standard checks (delegates to `check`)
  - [ ] Creates health check task when conditions are met
  - [ ] Does not create task when file already exists
  - [ ] Does not create task when fewer than 20 commits since deletion
  - [ ] Does not create task when not on default branch
  - [ ] Behaves like `dust check` when not in GitHub Actions
- [ ] Command registered in `lib/cli/main.ts`
- [ ] `.github/workflows/ci.yml` updated to use new command
- [ ] `bin/dust check` still works independently
- [ ] Existing idea `.dust/ideas/periodic-health-check-hook.md` deleted (covered by this task)
