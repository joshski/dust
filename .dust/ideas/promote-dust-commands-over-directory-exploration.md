# Promote dust commands over directory exploration

Task templates instruct agents to explore artifact directories using globs. Specialised commands like `dust principles` and `dust facts` provide richer feedback.

## Context

Dust provides specialised commands for listing artifacts:

- `dust principles` - displays principles with hierarchy, titles, opening sentences, and file paths
- `dust facts` - displays facts with titles, opening sentences, and file paths
- `dust ideas` - displays ideas with titles, opening sentences, and file paths
- `dust tasks` - displays tasks with titles, opening sentences, and file paths

These commands (implemented in `lib/cli/commands/list.ts` and `lib/cli/commands/type-list.ts`) provide structured output that helps agents understand content at a glance, rather than requiring them to glob and read individual files.

However, several task templates still direct agents to review raw artifact directories:

1. **Refine Idea tasks** (workflow-tasks.ts:345): "Review `.dust/principles/` for alignment and `.dust/facts/` for relevant design decisions."
2. **Decompose Idea tasks** (workflow-tasks.ts:368): "Review `.dust/principles/` to link relevant principles and `.dust/facts/` for design decisions that should inform the task."
3. **Expedite Idea tasks** (workflow-tasks.ts:421): "Review `.dust/principles/` and `.dust/facts/` for relevant context."
4. **Add Idea tasks** (workflow-tasks.ts:447): "Review `.dust/principles/` and `.dust/facts/` for relevant context."

## Proposed Change

Replace directory path references with command invocations in task templates:

**Before:**
```
Review `.dust/principles/` and `.dust/facts/` for relevant context.
```

**After:**
```
Run `{bin} principles` and `{bin} facts` to review relevant context.
```

The `{bin}` template variable resolves to the configured dust command (defaulting to `dust`).

## Benefits

1. **Richer context** - Commands show hierarchy (for principles), titles, and opening sentences
2. **Less token usage** - One command gives an overview vs. multiple file reads
3. **Consistent experience** - Agents learn to use dust commands as their primary interface
4. **Future-proof** - If command output improves, all templates benefit automatically

## Scope

### Files to update

- `lib/artifacts/workflow-tasks.ts` - Refine, Decompose, Expedite, and Add Idea task templates

### Implementation approach

The workflow-tasks.ts file writes task files via `createIdeaTransitionTask`. Currently templates are static strings. To support `{bin}` interpolation:

1. Add `DustSettings` as a parameter to `createRefineIdeaTask`, `decomposeIdea`, `createShelveIdeaTask`, and `createIdeaTask`
2. Replace directory path references with `${settings.dustCommand}` in template literals
3. Update call sites to pass settings (primarily `lib/cli/commands/refine.ts`, `lib/cli/commands/decompose.ts`, etc.)

This follows the same pattern used in `lib/cli/commands/focus.ts` and `lib/cli/commands/agent.ts`.

### Out of scope

Stock audits in `lib/audits/stock-audits.ts` have a separate concern: they are exported via the `@joshski/dust/audits` package entry point and consumed by downstream applications that may not have filesystem access to detect the appropriate dust command. This case is addressed by the separate [Audit Template Interpolation](./audit-template-interpolation.md) idea.

### Considerations

Some references to `.dust/` directories are intentional and should NOT be changed:
- Definition of Done items describing where files should be created (e.g., "links to relevant principles from .dust/principles/")
- Action items that instruct agents to read individual files for verification

The change should only apply to guidance sections that tell agents what to read for context.

## Open Questions

### Should the idea commands be included?

#### Include ideas command

The current proposal focuses on `principles` and `facts` commands, but the templates also mention reviewing ideas (in ideasHint). Change references like "Review existing ideas in `./.dust/ideas/`" to "Run `{bin} ideas`" for consistency.

#### Exclude ideas command

The ideas references are often about creating files in that directory, not reviewing existing content. Keep directory paths for creation targets.

### Should task templates also suggest `dust tasks`?

#### Add tasks command

Some task templates mention reviewing existing tasks or the task backlog. Include `{bin} tasks` in templates that currently mention reviewing `.dust/tasks/`.

#### Keep task directory references

Task file references are usually about creating or modifying specific task files, not reviewing the list.
