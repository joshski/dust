# Use dust commands in workflow task templates

Replace directory path references with dust command invocations in workflow task templates.

## Context

Workflow task templates (Refine Idea, Decompose Idea, Expedite Idea, Add Idea) currently instruct agents to review directories like `.dust/principles/` and `.dust/facts/`. Specialized commands like `dust principles`, `dust facts`, `dust ideas`, and `dust tasks` provide richer, more scannable output that helps agents understand content at a glance.

## Implementation

Update templates in `lib/artifacts/workflow-tasks.ts` to use command invocations:

**Before:**
```
Review `.dust/principles/` and `.dust/facts/` for relevant context.
```

**After:**
```
Run `{bin} principles` and `{bin} facts` to review relevant context.
```

Changes required:
1. Add `dustCommand: string` parameter to `createRefineIdeaTask`, `decomposeIdea`, `createShelveIdeaTask`, and `createIdeaTask`
2. Pass `dustCommand` through `createIdeaTransitionTask` to template functions
3. Replace directory path references in guidance sections with command invocations
4. Update repository wrapper in `lib/artifacts/index.ts` to accept and pass `dustCommand`
5. Update all tests to pass `dustCommand` parameter

## Scope

Only change guidance sections that tell agents what to read for context. Do NOT change:
- Definition of Done items describing where files should be created (e.g., "links to relevant principles from .dust/principles/")
- Action items that instruct agents to read individual files for verification

## Principles

- [Context Window Efficiency](../principles/context-window-efficiency.md) - Commands provide scannable output using fewer tokens than individual file reads
- [Progressive Disclosure](../principles/progressive-disclosure.md) - Command output shows titles and opening sentences; agents can follow up with individual file reads if needed
- [Unsurprising UX](../principles/unsurprising-ux.md) - Agents learn to use dust commands as their primary interface

## Blocked By

(none)

## Definition of Done

- [ ] `createRefineIdeaTask` uses `{dustCommand} principles` and `{dustCommand} facts` in template
- [ ] `decomposeIdea` uses `{dustCommand} principles` and `{dustCommand} facts` in template
- [ ] `createIdeaTask` (both Add and Expedite variants) uses `{dustCommand} principles`, `{dustCommand} facts`, `{dustCommand} ideas`, and `{dustCommand} tasks` as appropriate
- [ ] All call sites pass `dustCommand` parameter
- [ ] Tests verify command invocations appear in generated task files
- [ ] `bin/dust check` passes
