# Audit Task Read-Only Messaging

Improve audit task templates to clearly communicate that source code must not be modified.

## Context

Audit tasks (created via `dust audit <name>`) are canned tasks that help maintain project health by reviewing code patterns and creating ideas for improvements. These tasks are explicitly read-only - they should produce ideas in `.dust/ideas/` but never modify source code.

The current implementation in `lib/audits/stock-audits.ts` includes an `ideasHint` constant that instructs agents to "create new idea files in `./.dust/ideas/`", but:

1. The instruction is guidance only - nothing prevents an eager agent from "fixing" issues it finds
2. The definition of done checklist doesn't explicitly state that source code must remain unchanged
3. The current wording focuses on what to do (create ideas) rather than what not to do (modify code)

### Current Implementation

The `ideasHint` constant in `lib/audits/stock-audits.ts`:

```typescript
const ideasHint =
  'Review existing ideas in `./.dust/ideas/` to understand what has been proposed or considered historically, then create new idea files in `./.dust/ideas/` for any issues you identify, avoiding duplication.'
```

This hint is included in all 11 stock audit templates. The `transformAuditContent()` function in `lib/audits/index.ts` transforms audit templates into task files, prefixing the title with "Audit:".

## Proposed Solution

Add explicit read-only constraints to audit templates through two changes:

1. **Expand `ideasHint`**: Add explicit instruction stating "Do not modify source code - create ideas instead"

2. **Add Definition of Done item**: Add "- No changes to files outside `.dust/`" to each audit's definition of done checklist

This approach is low-cost and high-value - it provides clear guidance that most agents will follow, without requiring enforcement infrastructure.

## Related Principles

- **Agent Autonomy** (`agent-autonomy.md`): Agents should be productive without constant supervision - clear constraints enable this
- **Task-First Workflow** (`task-first-workflow.md`): Task instructions should clearly define the scope of allowed changes
- **Actionable Errors** (`actionable-errors.md`): Clear instructions prevent errors before they happen

## Open Questions

### Should we add a dedicated "Constraints" section to audit templates?

#### Option: Use existing sections

Keep the constraint messaging in `ideasHint` and Definition of Done. This is minimal change and keeps audits concise.

Pros: No template format changes, less verbose output
Cons: Constraints are scattered across two locations

#### Option: Add a "## Constraints" section

Add a new section to each audit template explicitly listing what the agent must not do.

Pros: Highly visible, unambiguous, easy to extend for future constraints
Cons: More verbose templates, requires updating all 11 stock audits plus the template structure
