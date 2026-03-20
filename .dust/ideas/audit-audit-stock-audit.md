# Audit Audit Stock Audit

Add a stock audit that reviews user-defined audits in `.dust/config/audits/` for quality and correctness.

## Context

Users can override stock audits or create custom audits by placing markdown files in `.dust/config/audits/`. These user audits are loaded by `buildAuditsRepository()` in `lib/audits/index.ts` and take precedence over stock audits with the same name. However, there's no guidance or validation for user audits—they might:

1. **Recommend creating tasks instead of ideas** - Audits should produce ideas, not tasks (with the intentional exception of `suggest-audits` which recommends follow-up audit tasks)
2. **Lack required sections** - Missing `## Scope`, `## Blocked By`, or `## Definition of Done` sections
3. **Contain stale references** - Reference files or patterns that no longer exist
4. **Duplicate existing stock audits** - Override a stock audit without meaningful customization

## Proposed Audit

Add a stock audit named `audit-audit` in `lib/audits/stock-audits.ts`.

### Template Scope

1. **Output guidance** - Verify audits guide agents to create ideas, not tasks
2. **Required sections** - Check for `## Scope`, `## Blocked By`, `## Definition of Done`
3. **Opening description** - Verify audits have a clear opening sentence describing their purpose
4. **Stale references** - Check that file/directory references in the audit are valid
5. **Stock audit relationship** - If overriding a stock audit, document what was customized and why

### Output Per Finding

- Audit file name and location
- Type of issue (output-guidance, missing-section, stale-reference, unclear-purpose, undocumented-override)
- Specific problem description
- Suggested fix

### Definition of Done

- Listed all user audits in `.dust/config/audits/`
- Verified each audit recommends ideas (not tasks) as output
- Checked for required sections
- Verified opening descriptions exist
- Checked file/directory references for validity
- Identified stock audit overrides without documented rationale
- Created ideas for any audit quality improvements needed

## Why This Matters

The `ideasHint` constant in `lib/audits/stock-audits.ts:18-19` establishes the pattern that audit output should be ideas:

> "Review existing ideas in `./.dust/ideas/` to understand what has been proposed or considered historically, then create new idea files in `./.dust/ideas/` for any issues you identify, avoiding duplication."

User audits that deviate from this pattern could confuse agents or create workflow inconsistencies. A meta-audit provides a systematic way to validate custom audits.

## Relationship to Existing Audits

- Similar to `agent-instruction-quality` (reviews instruction files for quality), this reviews audit files
- Complements `documentation-drift` by focusing specifically on audit template validity

## Open Questions

### Should this audit run automatically when new user audits are added?

#### Option: Manual audit only

Add as a stock audit that users run when they want to validate their custom audits. This is consistent with how other audits work.

#### Option: Lint-time validation

Add a lint check in `dust lint` that validates user audit structure (required sections, opening sentence). This catches issues earlier but may be too prescriptive.

### Should the audit check stock audit quality too, or only user audits?

#### Option: User audits only

Stock audits are maintained in the codebase with tests; they don't need runtime validation. Focus on user audits where quality is unknown.

#### Option: All audits

Check both stock and user audits. This could catch regressions in stock audits and ensures consistency.

### What severity should "recommends tasks instead of ideas" findings have?

#### Option: Error

Creating tasks from audits breaks the intended workflow. Treat as an error that should be fixed.

#### Option: Warning

Some audits might legitimately need to create tasks (like `suggest-audits`). Warn but don't block.
