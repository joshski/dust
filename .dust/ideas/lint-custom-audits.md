# Lint Custom Audits

Add validation and/or auditing for user-defined audits in `.dust/config/audits/`.

## Context

Users can override stock audits or create custom audits by placing markdown files in `.dust/config/audits/`. These user audits are loaded by `buildAuditsRepository()` in `lib/audits/index.ts:82-119` and take precedence over stock audits with the same name. However, there's no guidance or validation for user audits—they might:

1. **Recommend creating tasks instead of ideas** - Audits should produce ideas, not tasks (with the intentional exception of `suggest-audits` which recommends follow-up audit tasks)
2. **Lack required sections** - Missing `## Scope`, `## Blocked By`, or `## Definition of Done` sections
3. **Contain stale references** - Reference files or patterns that no longer exist
4. **Duplicate existing stock audits** - Override a stock audit without meaningful customization
5. **Lack an opening description** - Missing the opening sentence that becomes the audit's description

## Validation vs. Audit Separation

The existing validation pipeline (`lib/validation/validation-pipeline.ts`) already validates structural requirements for tasks (required headings, opening sentences). The same approach should apply to custom audits—structural issues belong in `dust lint`, while semantic/judgment-based issues belong in an audit.

### Should Be Validated (via `dust lint`)

These checks are deterministic and don't require judgment:

1. **Required sections** - `## Scope`, `## Blocked By`, `## Definition of Done` must be present (similar to `validateTaskHeadings()` in `lib/lint/validators/content-validator.ts:83-96`)
2. **Opening description** - Must have a clear opening sentence after the H1 heading (already validated by `validateOpeningSentence()`)
3. **Filename format** - Should follow kebab-case convention

### Should Remain as Audit Concerns

These require context, judgment, or file system exploration:

1. **Output guidance** - Whether the audit guides agents to create ideas vs. tasks requires semantic understanding
2. **Stale references** - Checking if mentioned file paths exist requires filesystem exploration and pattern matching
3. **Stock audit relationship** - Determining if an override is meaningfully customized requires comparing content and understanding intent

## Proposed Changes

### 1. Extend `dust lint` for Custom Audits

Extend the validation pipeline to validate custom audit files in `.dust/config/audits/`:

- Add audit files to `parseArtifacts()` as a new artifact type or special case
- Apply existing validators: `validateOpeningSentence()`, `validateOpeningSentenceLength()`
- Add new validator for audit-specific required sections (`## Scope`, `## Blocked By`, `## Definition of Done`)

### 2. Add `audit-quality` Stock Audit

Create a lighter-weight audit that focuses on semantic concerns:

- **Output guidance** - Check that audit templates guide agents to create ideas, not tasks
- **Stale references** - Verify file/directory references in the audit are valid
- **Override rationale** - If overriding a stock audit, check for documented customization rationale

## Why This Matters

The `ideasHint` constant in `lib/audits/stock-audits.ts:18-19` establishes the pattern that audit output should be ideas:

> "Review existing ideas in `./.dust/ideas/` to understand what has been proposed or considered historically, then create new idea files in `./.dust/ideas/` for any issues you identify, avoiding duplication."

This pattern is used in 29 of 30 stock audits (the exception being `suggest-audits`). User audits that deviate from this pattern could confuse agents or create workflow inconsistencies.

## Relationship to Existing Audits

- Similar to `agent-instruction-quality` (reviews instruction files for quality), this reviews audit files
- Complements `documentation-drift` by focusing specifically on audit template validity

## Open Questions

### Should audit files get a dedicated artifact type?

#### Option: Add as new artifact type

Add `'audits'` to `ARTIFACT_TYPES` in `lib/artifacts/index.ts` and create validators for `.dust/config/audits/*.md`. This treats audits as first-class artifacts alongside ideas, tasks, principles, and facts. Clean separation that reuses existing validation infrastructure. However, audits live in `config/` not at the top level of `.dust/`, making them architecturally different from other artifact types.

#### Option: Handle as special case in lint

Add special-case handling in `lintMarkdown()` that validates `.dust/config/audits/` files without treating them as a core artifact type. This reflects that audits are configuration, not planning artifacts. However, it may duplicate validation logic or require special handling in multiple places.

### Should stale reference checking be automated?

#### Option: Keep as audit concern

Have agents check references during audit execution. This allows for fuzzy matching and understanding of glob patterns. It handles complex patterns (globs, regex, directory references) and can understand context. Downside: only runs when audit is explicitly executed.

#### Option: Add basic validation to `dust lint`

Validate literal file paths mentioned in audit templates, skipping patterns with wildcards or special characters. This catches obvious errors immediately and runs automatically. However, it's limited to literal paths and may miss pattern-based references.
