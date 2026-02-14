# Extract stock audit templates to markdown files

Move stock audit templates from the hardcoded array in `audit.ts` to markdown files under `lib/templates/audits/`.

Create these files:
- `lib/templates/audits/security-review.md`
- `lib/templates/audits/test-coverage.md`
- `lib/templates/audits/dead-code.md`

Each file should contain the full markdown content currently in the `template` property of the corresponding audit object. The `name` is derived from the filename and the `description` is extracted from the opening sentence (matching how user audits already work).

Use `.md` extension to match user audit convention and be explicit about format.

## Goals

- [Intuitive Directory Structure](../goals/intuitive-directory-structure.md)
- [Reasonably DRY](../goals/reasonably-dry.md)

## Blocked By

(none)

## Definition of Done

- [ ] Three markdown files exist under `lib/templates/audits/`
- [ ] File contents match the current hardcoded templates
- [ ] The `STOCK_AUDITS` array is removed from `audit.ts`
- [ ] Stock audits are loaded from the markdown files at runtime
- [ ] Existing tests pass (or are updated to reflect the new loading mechanism)
- [ ] User audits can still override stock audits by name
