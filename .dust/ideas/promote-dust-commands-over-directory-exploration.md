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
5. **Stock audits** (stock-audits.ts): Several audits reference reading individual fact or principle files directly

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
- `lib/audits/stock-audits.ts` - Audit templates that reference `.dust/facts/` or `.dust/principles/`

### Considerations

Some references may be intentional. For example:
- "Read each fact file in `.dust/facts/`" in `factsVerification()` is an action item, not guidance
- Links to specific principles in Definition of Done items (e.g., "links to relevant principles from .dust/principles/") describe where files should be created, not what to review

The change should only apply to guidance sections that tell agents what to read for context, not to action items that describe file locations for creating or modifying content.
