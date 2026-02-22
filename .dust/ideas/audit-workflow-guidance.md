# Audit Workflow Guidance

Add a `dust agent how to audit` command that guides agents through audit workflows, and inject instructions into audits to run this command.

## Context

The audit system (`lib/audits/stock-audits.ts`) provides 10 stock audits covering different aspects of codebase health. When an agent picks up an audit task, it receives the audit template content which includes scope, principles, and a definition of done checklist. However, the template doesn't explain:

1. How to determine when this audit was last run
2. How to consider results from previous audits
3. How to navigate the general audit workflow
4. How to run dust commands within the audit context

The existing `dust new idea` command (`lib/cli/commands/new-idea.ts:15-64`) provides a pattern for this: it emits step-by-step instructions using template variables (like `${vars.bin}`) so agents know exactly how to invoke dust commands in their environment. The `TemplateVars` interface in `agent-shared.ts` already supports `bin` (the dust command), `agentName`, and other context-aware values.

Currently, the only injected content in audit templates is `ideasHint`:

```typescript
const ideasHint =
  'Review existing ideas in `./.dust/ideas/` to understand what has been proposed or considered historically...'
```

This is interpolated into every stock audit template. A similar pattern could inject guidance about running `dust agent how to audit`.

### Related ideas

- [Workflow instruction tasks](workflow-instruction-tasks.md) - proposes adding `dust decompose idea` and similar commands that emit step-by-step instructions
- [Context-aware guidance](context-aware-guidance.md) - explores varying guidance based on repository maturity and feature scope
- [Meta Audit](meta-audit.md) - analyzes commit activity to select which audits to run

## How it could work

### Part 1: The `dust agent how to audit` command

A new command that emits guidance for running audits:

```
dust agent how to audit
```

Output would include:
1. How to determine when audits were last run (search git history for audit task deletions)
2. How to review previous audit results (check commit messages, idea files)
3. How to run the current audit systematically
4. How to create ideas from findings
5. How to mark the audit as complete

The command would use `TemplateVars` to include the correct dust command (e.g., `bin/dust`, `npx dust`) in its instructions.

### Part 2: Template injection in audits

Each audit template would include a reference to the guidance command:

```typescript
const auditGuidanceHint = `For help with audit workflow, run \`${bin} agent how to audit\`.`
```

This would be injected into audit templates similar to `ideasHint`, appearing near the top of each audit so agents know help is available.

### Part 3: Environment-aware instructions

The `transformAuditContent()` function in `lib/audits/index.ts` would be extended to accept template variables and perform substitution when creating audit task files. This ensures the injected dust command matches the project's `dustCommand` setting.

## Open Questions

### Should `dust agent how to audit` be a separate command or part of `dust agent`?

#### Option: Separate `dust agent how to audit` command

Create a new dedicated command for audit guidance. Follows the pattern established by `dust new idea` and `dust new task`.

Pros: Clear purpose, easy to discover via `dust help`, can evolve independently
Cons: Another command to maintain, may not be discoverable during an audit

#### Option: Integrate into `dust agent` routing

Extend `dust agent` to recognize audit contexts and route to audit-specific guidance. When an agent runs `dust agent` while working on an audit task, it could automatically include audit guidance.

Pros: Context-aware, no extra command needed
Cons: More complex routing logic, harder to invoke explicitly

#### Option: Add guidance section to audit templates directly

Instead of a command, embed the workflow guidance directly in each audit template's preamble. No separate command needed.

Pros: All guidance in one place, always visible
Cons: Significantly lengthens audit templates, harder to update consistently

### How should agents determine when an audit was last run?

#### Option: Git history search

Instruct agents to search git history for patterns like "Audit: <name>" in commit messages or deleted audit task files.

Pros: Uses existing git infrastructure, no new state needed
Cons: Requires agents to construct appropriate git commands, may miss audits that didn't follow naming conventions

#### Option: Audit run log

Add a `.dust/logs/audits.jsonl` file that tracks when each audit was run. The `dust audit` command would append entries when creating audit tasks.

Pros: Structured data, easy to query, reliable
Cons: New state to maintain, needs cleanup logic for old entries

#### Option: Commit message convention

Establish a convention like `[audit:security-review]` in commit messages that mark audit completion. Easy to grep.

Pros: Human-readable, searchable via git log
Cons: Relies on discipline, may not be followed consistently

### Should template injection happen at audit definition time or task creation time?

#### Option: Task creation time (transformAuditContent)

The `transformAuditContent()` function in `lib/audits/index.ts` would perform template variable substitution when creating the audit task file.

Pros: Task file contains resolved values, works even if user overrides audits
Cons: Requires passing template variables through the audit command pipeline

#### Option: Audit definition time (stock-audits.ts)

Stock audits would accept template variables as parameters and embed them directly.

Pros: Self-contained audit templates
Cons: Stock audits can't know the dust command until invoked, breaks current parameter-free design

#### Option: Leave placeholders for agent to resolve

Use placeholders like `{dustCommand}` in templates and document that agents should consult settings to resolve them.

Pros: No code changes needed, agents can handle this
Cons: Adds cognitive load, agents may not resolve correctly
