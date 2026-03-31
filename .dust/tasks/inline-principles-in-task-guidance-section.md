# Inline Principles in Task Guidance Section

Modify the decompose workflow to embed relevant principle content directly in created task files under a new `## Guidance` section. This ensures implementing agents read the guidance without extra tool calls.

## Background

Data from dustbucket shows that across 546 decompose sessions:
- 95% list principles (`dust principles`)
- 52% read local principle files
- Only 2.6% read any core principle file
- Only 0.5% of created tasks reference core principles

Core principles (actionable-errors, design-for-testability, functional-core-imperative-shell, etc.) are effectively invisible to implementing agents because they require running `dust core principle <name>`, which agents almost never do.

## Implementation Strategy

1. Add a new optional `## Guidance` section to the task file format (update task-file-format.md fact)
2. Update the `decomposeIdea` function description in `lib/artifacts/workflow-tasks.ts` to instruct agents to:
   - Select relevant principles as they currently do
   - Create a `## Guidance` section in each new task file
   - Inline the full content of ALL selected principles (both core and local) in that section
   - Keep principle links in the `## Principles` section for traceability
3. The Guidance section should appear after Principles but before Definition of Done

## Principles

- [Agent Autonomy](../principles/agent-autonomy.md)
- [Context Window Efficiency](../principles/context-window-efficiency.md)
- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Small Units](../principles/small-units.md)

## Guidance

### Agent Autonomy

Dust exists to enable AI agents to produce work autonomously.

Agents should be able to complete meaningful work without constant human intervention. This means:

- Providing clear, actionable instructions
- Embedding necessary context directly in task files
- Minimizing the need for agents to search for information
- Making the "happy path" obvious and friction-free

When designing workflows, ask: "Can an agent complete this task from start to finish without asking questions or getting stuck?"

### Context Window Efficiency

Dust should be designed with short attention spans in mind.

Agents have limited context windows and must process information efficiently. This means:

- Keeping individual artifacts small and focused
- Inlining critical information instead of forcing link traversal
- Using progressive disclosure to reveal details only when needed
- Avoiding unnecessary repetition or boilerplate

Every piece of text in a task file should earn its place by being directly actionable.

### Functional Core, Imperative Shell

Separate code into a pure "functional core" and a thin "imperative shell." The core takes values in and returns values out, with no side effects.

The functional core:
- Contains business logic and transformations
- Has no I/O, no mutation, no randomness
- Is easy to test with simple input/output assertions
- Can be reasoned about in isolation

The imperative shell:
- Handles all I/O and side effects
- Calls the functional core with data
- Is kept as thin as possible
- Often doesn't need unit tests since the logic is in the core

This makes code easier to understand, test, and modify with confidence.

### Small Units

Ideas, principles, facts, and tasks should each be as discrete and fine-grained as possible.

Small, focused artifacts are easier to:
- Understand in isolation
- Modify without unintended consequences
- Compose into larger wholes
- Fit within context windows
- Find when searching

When in doubt, split an artifact into smaller pieces rather than combining them.

## Task Type

implement

## Blocked By

(none)

## Definition of Done

- `.dust/facts/task-file-format.md` documents the optional `## Guidance` section
- The `decomposeIdea` function instructions in `lib/artifacts/workflow-tasks.ts` tell agents to inline principle content in a `## Guidance` section
- The instructions specify to inline ALL selected principles (both core and local)
- Tests pass (`bin/dust check`)
- This task file itself demonstrates the new pattern with inlined principle content
