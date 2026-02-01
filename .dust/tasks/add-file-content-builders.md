# Add File Content Builders for E2E Tests

Create builder functions to generate markdown content for tasks, goals, ideas, and facts files, making e2e test data more readable and maintainable.

## Background

The e2e tests in `tests/e2e/` currently inline complete markdown content for test files. For example:

```typescript
'add-logging.md': `# Add Logging

Add structured logging throughout the application.

## Goals

- [Fast Feedback](../goals/fast-feedback.md)

## Blocked by

(none)

## Definition of done

- [ ] Logging library is installed
- [ ] Key operations are logged
`
```

This is verbose and the formatting is hard to maintain. Builder functions would make this cleaner:

```typescript
'add-logging.md': buildTask({
  title: 'Add Logging',
  description: 'Add structured logging throughout the application.',
  goals: [{ name: 'Fast Feedback', path: '../goals/fast-feedback.md' }],
  blockedBy: [],
  definitionOfDone: ['Logging library is installed', 'Key operations are logged']
})
```

## Implementation

Create a new file `tests/e2e/content-builders.ts` with the following functions:

### `buildTask(options)`

Options:
- `title: string` - The task title (used in H1)
- `description?: string` - Optional description paragraph after title
- `goals?: Array<{ name: string; path: string }> | '(none)'` - Goal links or "(none)"
- `blockedBy?: Array<{ name: string; path: string }> | '(none)'` - Blocker links or "(none)"
- `definitionOfDone: string[]` - Checklist items (without `- [ ]` prefix)

### `buildGoal(options)`

Options:
- `title: string` - The goal title
- `description: string` - The goal description

### `buildIdea(options)`

Options:
- `title: string` - The idea title
- `description: string` - The idea description

### `buildFact(options)`

Options:
- `title: string` - The fact title
- `content: string` - The fact content

## Files to change

- Create `tests/e2e/content-builders.ts` with the builder functions
- Update existing e2e tests to use the builders:
  - `tests/e2e/blocked-tasks.test.ts`
  - `tests/e2e/pick-task.test.ts`
  - `tests/e2e/discover-available-work.test.ts`
  - `tests/e2e/list-tasks.test.ts`
  - `tests/e2e/edge-cases.test.ts`
  - `tests/e2e/explore-goals.test.ts`
  - `tests/e2e/new-content.test.ts`

## Goals

- [Readable Test Data](../goals/readable-test-data.md)

## Blocked by

(none)

## Definition of done

- [ ] `tests/e2e/content-builders.ts` exists with `buildTask`, `buildGoal`, `buildIdea`, and `buildFact` functions
- [ ] All e2e tests that inline markdown content are updated to use the builders
- [ ] Tests pass with `npm test`
- [ ] No inline markdown template strings remain in e2e test files for tasks, goals, ideas, or facts
