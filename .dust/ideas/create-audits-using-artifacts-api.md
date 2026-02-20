# Create audits using artifacts API

Extend the artifacts API to support audits as a first-class artifact type.

Currently, audits are managed separately from the artifacts API through `lib/audits/stock-audits.ts` and `lib/cli/commands/audit.ts`. The artifacts API provides a unified interface for principles, facts, ideas, and tasks, but audits require CLI commands. This creates inconsistency for consumers who want to work with audits programmatically.

## Proposed Capabilities

The artifacts API would need to support:

1. **List audits** - Return all available audits (stock + user overrides)
2. **Parse audit** - Get audit details by name
3. **Create audit task** - Create a task from an audit template
4. **Create/update user audit** - Write an overridden audit to `.dust/config/audits/`

## Current State

- **Stock audits** are defined in `lib/audits/stock-audits.ts` as functions returning markdown templates
- **User audits** can override stock audits by placing files in `.dust/config/audits/*.md`
- The `dust audit` CLI command lists and creates tasks from audits
- Stock audits are loaded via `loadStockAudits()` and return `StockAudit` objects with name, description, and template
- The CLI transforms audit titles to "Audit: {Title}" when creating tasks

## Open Questions

### Should audits be a separate API export or integrated into the main ArtifactsRepository?

#### Separate export

Create a new `buildAuditsRepository()` function exported from `@joshski/dust/audits`. Audits are conceptually different from other artifacts - they're templates rather than persistent documents. This keeps concerns separated and avoids bloating the main artifacts API.

#### Integrated into ArtifactsRepository

Add audit methods directly to `ArtifactsRepository`. This provides a single unified API for all dust artifacts, matching user expectations that "dust artifacts" includes audits.

### Should stock audits be configurable per-project?

#### No configuration

Keep stock audits as a fixed set. Users can override individual audits in `.dust/config/audits/` but cannot disable them. This is the simplest approach and matches current behavior.

#### Allow disabling via settings.json

Add a `disabledStockAudits: string[]` field to settings.json that allows projects to hide specific stock audits from the list. Some audits may not be relevant to all projects.

#### Allow custom stock audits directory

Support a `stockAuditsDir` setting that allows projects to provide their own directory of stock audits, replacing or supplementing the built-in ones. This enables organization-wide audit standards.

### How should the API expose the audit source?

#### Include source in parsed audit

Return an `Audit` type with a `source: 'stock' | string` field where string is the file path for user overrides. This matches how the CLI currently handles audit display.

#### Separate listing methods

Provide `listStockAudits()` and `listUserAudits()` methods so consumers can distinguish by which method they use. This is more explicit but requires two API calls.
