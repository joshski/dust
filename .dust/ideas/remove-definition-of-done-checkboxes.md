# Remove Definition of Done Checkboxes

Definition of Done sections in audit templates should use plain list items, not checkboxes.

## Context

The "Definition of Done" section in task and audit templates serves as acceptance criteria for agents and humans to understand when work is complete. Checkboxes (`- [ ]`) in these sections are problematic because:

1. **Checkboxes imply interactive tracking** — They suggest items should be checked off as progress is made, but agents don't track progress this way
2. **Inconsistency** — Most Definition of Done sections in stock audits use plain lists, but some use checkboxes
3. **Semantic mismatch** — Definition of Done describes completion criteria, not a to-do list to be checked during work

## Affected Files

Two files contain checkboxes in Definition of Done sections:

### `lib/audits/stock-audits.ts`

The following audit templates use checkboxes:
- `agentInstructionAudit` (lines 339-346)
- `documentationDrift` (lines 488-494)
- `feedbackLoopSpeed` (lines 650-657)
- `securityReview` (lines 803-808)
- `dependencyHealth` (lines 1912-1919)
- `checksAudit` (lines 2071-2077)
- `commitHistoryReview` (lines 2220-2227)
- `suggestAudits` (lines 2309-2322)

### `lib/audits/checks-audit.ts`

The `checksAuditTemplate()` function (lines 793-799) also uses checkboxes in its Definition of Done section.

## Implementation

Replace all `- [ ]` checkbox list items with `- ` plain list items in the Definition of Done sections of the affected audit templates.

## Out of Scope

The test file `lib/bucket/repository.test.ts` contains a checkbox in test fixture data (`VALID_TASK_CONTENT`). This is appropriate for testing task parsing and should remain unchanged.
