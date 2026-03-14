# Workflow instruction tasks

Add dust commands that provide step-by-step instructions for workflow operations like decomposing ideas.

## Background

Currently, workflow operations have different instruction delivery mechanisms:

1. **`dust new task`** - Emits step-by-step instructions for creating tasks
2. **`dust focus`** - Emits implementation instructions when focused on a task
3. **Workflow tasks** (Refine/Decompose/Shelve Idea) - Instructions are embedded in the task file body, created programmatically by `lib/workflow-tasks.ts`

The workflow task approach works but has some limitations:
- Instructions are only visible when the task file is read
- Agents can't ask "how do I decompose an idea?" without first having a decompose task created
- The instructions are static and can't adapt to context (e.g., current state of the idea)

## Concept

Add dust commands that explain how to perform workflow operations:

- `dust decompose idea "<idea-name>"` - Show instructions for decomposing an idea into tasks
- `dust refine idea "<idea-name>"` - Show instructions for refining an idea
- `dust shelve idea "<idea-name>"` - Show instructions for archiving an idea

These would complement the existing programmatic task creation. An agent could either:
1. Run the command to get instructions and act on them, or
2. Have a workflow task created that contains similar instructions

## Potential Benefits

- **Discoverability** - Agents can learn workflow procedures via `dust help`
- **Context-aware instructions** - Commands could inspect the idea file and provide tailored guidance (e.g., "This idea has 3 open questions - resolve these before decomposing")
- **Consistency with `dust new task`** - Aligns workflow operations with the pattern already established for task creation
- **On-demand guidance** - Instructions available without creating a task file first

## Implementation Considerations

The `dust new task` command ([`lib/cli/commands/new-task.ts`](../../lib/cli/commands/new-task.ts)) provides a template for this pattern. It emits numbered instructions that guide agents through a multi-step process.

Workflow instructions would need to:
1. Read the target idea file to understand its current state
2. Check for open questions and suggest resolving them first (for decompose)
3. Reference relevant principles and facts
4. Provide specific guidance on what the output should look like

## Open Questions

### Should workflow commands create task files or just emit instructions?

#### Emit instructions only

Commands like `dust decompose idea "X"` would output instructions to stdout without creating any files. The agent follows the instructions and creates appropriate artifacts. This is consistent with `dust new task` which guides but doesn't auto-create.

**Pros:** Simpler implementation, more flexible, agents can adapt instructions to context
**Cons:** No persistent record of the workflow being initiated

#### Create a task file and emit instructions

Commands would create a workflow task file (like the current `createDecomposeIdeaTask`) AND emit instructions. This provides both the persistent artifact and immediate guidance.

**Pros:** Maintains current workflow task pattern, provides traceability
**Cons:** Potentially redundant (instructions exist in both places)

#### Only create task files (current behavior)

Keep the current approach where workflow tasks are created programmatically and contain embedded instructions. Add commands only if there's a clear need beyond what task files provide.

**Pros:** No new code needed, already works
**Cons:** Doesn't address discoverability or context-aware instruction gaps

### Should workflow commands integrate with `dust agent` routing?

#### Add explicit routing in `dust agent`

Extend the agent greeting to include workflow operations:

```
6. **Decompose an idea** → `dust decompose idea`
   User wants to break an idea into tasks. Keywords: "decompose...", "break down...", "create tasks from..."
```

**Pros:** Natural language triggers for workflow operations, consistent with existing routing
**Cons:** More options in agent greeting increases cognitive load

#### Route through existing commands

The current `dust agent` already routes to `dust new task` which could be extended to handle idea decomposition. If the user mentions an idea by name, `dust new task` could detect this and provide decomposition-specific instructions.

**Pros:** Fewer top-level commands, smarter routing
**Cons:** Overloads `dust new task` with additional responsibility

#### Keep workflow operations implicit

Workflow operations are initiated when agents pick up Refine/Decompose/Shelve tasks from the backlog. No explicit agent routing needed since these are just task types.

**Pros:** Current model works, no changes needed
**Cons:** Doesn't help agents who want to initiate workflow operations proactively

### How should context-aware instructions work?

#### Static instructions with dynamic placeholders

Commands emit templated instructions where placeholders are filled with idea-specific values (title, slug, open question count). The instructions themselves remain procedural.

**Pros:** Predictable output, easy to implement and test
**Cons:** Limited adaptability to complex situations

#### Conditional instruction blocks

Commands analyze the idea state and emit different instructions based on conditions. For example, if an idea has open questions, emit "resolve open questions first" instructions; otherwise, emit decomposition instructions.

**Pros:** More helpful guidance, prevents common mistakes
**Cons:** More complex logic, harder to test all paths

#### Warnings only

Emit standard instructions but prefix them with warnings about potential issues (e.g., "Warning: This idea has 3 unresolved open questions"). Let the agent decide whether to proceed.

**Pros:** Simple implementation, respects agent autonomy
**Cons:** May lead to agents ignoring important warnings
