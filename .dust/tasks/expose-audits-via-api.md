# Expose Audits via API

Create a `buildAuditsRepository()` function that provides programmatic access to audits. Export from `@joshski/dust/audits`, mirroring the repository pattern used by `buildArtifactsRepository()`.

## Background

Currently, audits are managed separately from the artifacts API through `lib/audits/stock-audits.ts` and `lib/cli/commands/audit.ts`. The CLI handles listing audits, parsing templates, and creating tasks, but there's no programmatic API for consumers who want to work with audits outside the CLI.

## Requirements

The repository should provide:

1. **`listAudits()`** - Return all available audits (stock + user overrides from `.dust/config/audits/`)
2. **`parseAudit({ name })`** - Get audit details by name, returning an `Audit` type with `name`, `title`, `description`, `template`, and `source: 'stock' | string` (file path for user overrides)
3. **`createAuditTask({ name })`** - Create a task from an audit template (reuse `transformAuditContent` from the CLI)

User audits in `.dust/config/audits/*.md` take precedence over stock audits with the same name.

## Implementation Notes

- Follow the pattern established by `buildArtifactsRepository()` in `lib/artifacts/index.ts`
- Reuse `loadStockAudits()` from `lib/audits/stock-audits.ts`
- Reuse `transformAuditContent()` from `lib/cli/commands/audit.ts` (may need to export it)
- Add comprehensive tests in `lib/audits/index.test.ts`

## Principles

- [Decoupled Code](../principles/decoupled-code.md)
- [Comprehensive Test Coverage](../principles/comprehensive-test-coverage.md)

## Blocked By

(none)

## Definition of Done

- [ ] `buildAuditsRepository(fileSystem, dustPath)` function created in `lib/audits/index.ts`
- [ ] `listAudits()` returns combined stock and user audits with user audits taking precedence
- [ ] `parseAudit({ name })` returns audit details including source
- [ ] `createAuditTask({ name })` creates task file using transformed template
- [ ] Tests cover all repository methods
- [ ] `bin/dust check` passes
