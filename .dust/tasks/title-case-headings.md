# Title Case Headings

Change the standard task headings to use title case for consistency.

## Changes Required

### 1. Update the heading constants

In `lib/cli/commands/lint-markdown.ts`:

- Change `REQUIRED_HEADINGS` from:
  ```ts
  const REQUIRED_HEADINGS = ['## Goals', '## Blocked by', '## Definition of done']
  ```
  to:
  ```ts
  const REQUIRED_HEADINGS = ['## Goals', '## Blocked By', '## Definition of Done']
  ```

- Update `SEMANTIC_RULES` at line 181 to use `'## Blocked By'` instead of `'## Blocked by'`

### 2. Update the template

In `lib/templates/agent-new-task.txt`:

- Change `## Blocked by` to `## Blocked By` (line 22)
- Change `## Definition of done` to `## Definition of Done` (line 23)

### 3. Update the documentation

In `.dust/facts/task-file-format.md`:

- Change `## Blocked by` to `## Blocked By`
- Change `## Definition of done` to `## Definition of Done`

### 4. Update existing content files

Update all files in `.dust/` that use these headings:

- `.dust/tasks/check-timing-and-summary-status.md`
- `.dust/ideas/periodic-health-check-hook.md`

### 5. Update test files

Update test files that reference these headings:

- `lib/cli/commands/lint-markdown.test.ts`
- `lib/cli/commands/new-task.test.ts`
- `lib/cli/commands/next.test.ts`
- `lib/cli/commands/loop.test.ts`
- `lib/cli/commands/pre-push.test.ts`
- `tests/edge-cases.test.ts`
- `tests/new-content.test.ts`
- `tests/support/content-builders.ts`

## Goals

- [Consistent Naming](../goals/consistent-naming.md)

## Blocked By

(none)

## Definition of Done

- [ ] `REQUIRED_HEADINGS` constant uses title case
- [ ] `SEMANTIC_RULES` updated to match
- [ ] Template file uses title case headings
- [ ] Documentation uses title case headings
- [ ] All existing task and idea files updated
- [ ] All tests updated and passing
- [ ] `bin/dust lint markdown` passes
