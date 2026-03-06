# Decomposition Hints

Allow projects to provide custom guidance for agents decomposing ideas into tasks via a configuration file.

## Context

When an agent decomposes an idea into tasks, the instructions come from `decomposeIdea()` in `lib/artifacts/workflow-tasks.ts:327-352`. These instructions are generic:

> Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software...

Different projects may benefit from different decomposition approaches:

- A visual project might want: "Be visual, use screenshots in task descriptions"
- A documentation-heavy project: "Don't be too specific in task details"
- A data-intensive project: "Pay special attention to database indexes and query performance"
- A security-critical project: "Include security considerations in every task"

Currently, dust has a mechanism for agent-specific instructions via `.dust/config/agents/{agent-type}.md` (see `loadAgentInstructions()` in `lib/cli/commands/agent-shared.ts:36-60`), but this applies to the agent greeting, not to specific workflow operations like decomposition.

## How it could work

A new file at a well-known path (e.g., `.dust/config/decomposition-hints.md`) would be read during the `decomposeIdea()` function and appended to the decomposition task instructions.

Example `.dust/config/decomposition-hints.md`:

```markdown
When decomposing ideas in this project:

- Include visual mockups or screenshots where UI changes are involved
- Reference the design system components in `src/components/ui/`
- Consider mobile-first responsiveness for any frontend tasks
```

The agent executing the decompose task would see this additional context and adapt their decomposition approach accordingly.

## Related mechanisms

- **Agent-specific instructions** (`loadAgentInstructions` in `agent-shared.ts`) - per-agent-type instructions loaded from `.dust/config/agents/{agent-type}.md`
- **Expedite Idea** (in `workflow-tasks.ts`) - already has different instructions telling agents to "implement directly if confident"
- **Context-aware guidance** (`.dust/ideas/context-aware-guidance.md`) - explores adapting instructions based on repository maturity

## Open Questions

### Where should decomposition hints live?

#### A dedicated file in `.dust/config/`

Use `.dust/config/decomposition-hints.md` as a single file containing all hints for idea decomposition.

Pros: Simple, discoverable, follows existing config patterns
Cons: Only covers decomposition; other workflow operations (refine, shelve) might also benefit from hints

#### A section in `settings.json`

Add a `decompositionHints` field to `.dust/config/settings.json` containing the hint text.

Pros: Keeps all configuration in one place, machine-readable
Cons: Multi-line markdown in JSON is awkward to author and read

#### A directory for workflow hints

Use `.dust/config/workflow/decompose.md`, `.dust/config/workflow/refine.md`, etc., allowing hints for any workflow operation.

Pros: Extensible to all workflow operations, clear organization
Cons: More complex structure, may be over-engineered if only decomposition needs hints

### Should hints be validated?

#### No validation

Read the file as-is and append to instructions. Trust the project maintainer to provide useful guidance.

Pros: Simple, flexible, no maintenance burden
Cons: Bad hints could confuse agents or conflict with core instructions

#### Lint for anti-patterns

Add optional linting that warns about potentially problematic hints (e.g., "never ask questions", "skip testing").

Pros: Prevents common mistakes, maintains quality
Cons: Subjective, hard to enumerate all anti-patterns

### Should hints apply to all workflow operations or just decomposition?

#### Decomposition only

Keep scope narrow. Only decompose-idea tasks receive hints.

Pros: Simple, addresses the immediate need
Cons: Other operations (refine, shelve, capture) might also benefit

#### All idea workflow operations

Apply hints to refine, decompose, and shelve operations.

Pros: Consistent approach, more value from the configuration
Cons: Different operations may need different kinds of hints

#### Separate hints per operation

Allow different hint files for different operations: `decompose-hints.md`, `refine-hints.md`, etc.

Pros: Maximum flexibility, each operation gets tailored guidance
Cons: Configuration proliferation, more files to maintain
