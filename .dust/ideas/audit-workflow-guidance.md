# Audit Workflow Guidance

Add a `dust how to audit` command that guides agents through audit workflows.

## Context

The audit system (`lib/audits/stock-audits.ts`) provides 11 stock audits covering different aspects of codebase health. When an agent picks up an audit task, it receives the audit template content which includes scope, principles, and a definition of done checklist. However, the template doesn't explain:

1. How to determine when this audit was last run
2. How to consider results from previous audits
3. How to navigate the general audit workflow
4. How to create ideas from findings

The existing `dust new idea` command (`lib/cli/commands/new-idea.ts:15-64`) provides a pattern for this: it emits step-by-step instructions using template variables (like `${vars.bin}`) so agents know exactly how to invoke dust commands in their environment. The `TemplateVars` interface in `agent-shared.ts` already supports `bin` (the dust command), `agentName`, and other context-aware values.

### Related ideas

- [Workflow instruction tasks](workflow-instruction-tasks.md) - proposes adding `dust decompose idea` and similar commands that emit step-by-step instructions
- [Meta Audit](meta-audit.md) - analyzes commit activity to select which audits to run

## How it could work

A new command following the existing verb-noun pattern:

```
dust how to audit
```

Output would include step-by-step instructions:
1. How to determine when audits were last run (search git history for "Audit:" commit prefixes)
2. How to review previous audit results (check recent commits, idea files created)
3. How to work through the definition of done systematically
4. How to create ideas from findings (reference `dust new idea`)
5. How to mark the audit as complete (delete task file, commit with "Audit: <name>" prefix)

The command would use `TemplateVars` to include the correct dust command (e.g., `bin/dust`, `npx dust`) in its instructions, following the pattern established by `dust new idea` and `dust new task`.

### Implementation approach

Add a new command file `lib/cli/commands/how-to-audit.ts` following the pattern of `new-idea.ts`:

```typescript
function howToAuditInstructions(vars: TemplateVars): string {
  return dedent`
    ## Running an Audit

    Follow these steps:

    1. Check when this audit was last run:
       \`git log --oneline --grep="Audit:" | head -20\`
    2. Review any ideas created from previous audit runs
    3. Work through the Definition of Done checklist systematically
    4. Create ideas for issues found: \`${vars.bin} new idea\`
    5. When complete, delete the task file and commit:
       \`git add -A && git commit -m "Audit: <Audit Name>"\`
    6. Push your commit to the remote repository
  `
}
```

## Open Questions

### Should guidance be injected into audit templates or provided on-demand via command?

#### Option: On-demand command only

The `dust how to audit` command is run by agents when they need guidance. Audit templates remain unchanged.

Pros: No template bloat, guidance can evolve independently, follows established pattern
Cons: Agents may not know to run the command

#### Option: Inject hint into audit templates

Add a line to each audit template like: "For workflow guidance, run `{bin} how to audit`."

Pros: Agents always see the hint when working on audits
Cons: Requires template variable substitution in `transformAuditContent()`, adds coupling

#### Option: Both

Inject a hint AND provide the command. The hint tells agents the command exists; the command provides the full guidance.

Pros: Combines discoverability with on-demand detail
Cons: More implementation work, potential duplication

### How detailed should the git history search guidance be?

#### Option: Simple grep pattern

Instruct agents to use `git log --oneline --grep="Audit:"` to find previous audit completions.

Pros: Simple, works with current commit conventions
Cons: May miss audits with different commit message formats

#### Option: Specific per-audit search

When an agent is working on "security-review", guide them to search for "Audit: Security Review" specifically.

Pros: More precise results
Cons: Requires knowing the current audit name, more complex instructions

#### Option: List all audit history

Provide a more comprehensive search that shows all audit-related commits, letting the agent filter.

Pros: Complete visibility
Cons: May be noisy for repositories with many audit runs
