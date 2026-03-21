# Lint Custom Audit Files

Extend `dust lint` to validate custom audit files in `.dust/config/audits/` without adding a new artifact type.

## Background

Users can create custom audits by placing markdown files in `.dust/config/audits/`. These files are loaded by `buildAuditsRepository()` in `lib/audits/index.ts:82-119` and take precedence over stock audits. However, there's no validation for user audits—they might lack required sections or opening descriptions.

Stock audits follow a consistent structure with `## Scope`, `## Blocked By`, and `## Definition of Done` sections. User audits should follow the same structure to ensure agents can execute them effectively.

## Implementation

Following the [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md) principle, add validation logic as pure functions that operate on parsed artifacts.

### Changes

1. **Extend `parseArtifacts()` in `lib/validation/validation-pipeline.ts`**
   - Add special-case handling to parse `.dust/config/audits/*.md` files
   - Store parsed audit files separately (not as a new artifact type)

2. **Add audit validators in `lib/lint/validators/audit-validator.ts`**
   - `validateAuditHeadings()` - Check for required `## Scope`, `## Blocked By`, `## Definition of Done` sections
   - Reuse existing `validateOpeningSentence()` and `validateOpeningSentenceLength()` validators

3. **Integrate in `validateArtifacts()` in `lib/validation/validation-pipeline.ts`**
   - Apply audit-specific validators to parsed audit files

### Reuse Existing Validators

- `validateOpeningSentence()` - Already validates opening descriptions
- `validateOpeningSentenceLength()` - Already enforces concise summaries
- `validateFilename()` - Already validates kebab-case convention

## Principles

- [Lint Everything](../principles/lint-everything.md)
- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Actionable Errors](../principles/actionable-errors.md)
- [Fast Feedback](../principles/fast-feedback.md)

## Blocked By

(none)

## Definition of Done

- Running `dust lint` validates `.dust/config/audits/*.md` files
- Missing `## Scope` section produces a lint error
- Missing `## Blocked By` section produces a lint error
- Missing `## Definition of Done` section produces a lint error
- Missing opening sentence produces a lint error
- Opening sentence over 150 characters produces a lint error
- Invalid filename (not kebab-case) produces a lint error
- Unit tests cover all validation rules
- Existing lint tests continue to pass
