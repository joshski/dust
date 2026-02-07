# Refactor Workflow Task Generation

Move `lib/cli/idea-transition-tasks.ts` to `lib/workflow-tasks.ts` and update the corresponding fact file. The module only depends on a `FileSystem` interface and has no CLI-specific dependencies, so it belongs at the library root rather than under `lib/cli/`.

## Changes

### Move the module

- `lib/cli/idea-transition-tasks.ts` → `lib/workflow-tasks.ts`
- `lib/cli/idea-transition-tasks.test.ts` → `lib/workflow-tasks.test.ts`

### Update imports

- `lib/cli/commands/lint-markdown.ts`: change `from '../idea-transition-tasks'` to `from '../../workflow-tasks'`
- `lib/cli/idea-transition-tasks.test.ts` (now `lib/workflow-tasks.test.ts`): change `from './idea-transition-tasks'` to `from './workflow-tasks'`

### Update the fact file

Rewrite `.dust/facts/idea-transition-tasks.md` → `.dust/facts/workflow-tasks.md` to reflect:

- The new module location (`lib/workflow-tasks.ts`)
- That `IDEA_TRANSITION_PREFIXES` is defined in `workflow-tasks.ts` and re-exported from `lint-markdown.ts`
- The current set of exported functions (`createRefineIdeaTask`, `createTaskFromIdea`, `createShelveIdeaTask`, `createCaptureIdeaTask`)

## Goals

(none)

## Blocked By

(none)

## Definition of Done

- [ ] Module moved from `lib/cli/idea-transition-tasks.ts` to `lib/workflow-tasks.ts`
- [ ] Test file moved from `lib/cli/idea-transition-tasks.test.ts` to `lib/workflow-tasks.test.ts`
- [ ] All imports updated to use the new path
- [ ] Fact file renamed from `idea-transition-tasks.md` to `workflow-tasks.md` with accurate content
- [ ] `bin/dust lint markdown` passes
- [ ] Tests pass
