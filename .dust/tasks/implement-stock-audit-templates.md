# Implement stock audit templates

Create the initial set of stock audit templates bundled with dust. Stock audits are hardcoded in the codebase (not fetched from external sources).

Each stock audit should be defined as a template with:
- A short name (slug) for the audit
- A one-line description shown in `dust audit` list
- Full markdown content for the task file

Suggested initial stock audits:
- **security-review** - Check for hardcoded secrets, SQL injection patterns, etc.
- **test-coverage** - Identify untested code paths or missing test files
- **dead-code** - Find unused exports, unreachable code
- **dependency-audit** - Review outdated or vulnerable dependencies
- **documentation-gaps** - Find undocumented public APIs

The templates should follow the standard task file format with Goals, Blocked By, and Definition of Done sections.

## Goals

- [Make Changes with Confidence](../goals/make-changes-with-confidence.md)
- [Easy Adoption](../goals/easy-adoption.md)

## Blocked By

- [Implement dust audit list command](implement-dust-audit-list-command.md)

## Definition of Done

- [ ] Stock audits are defined in a module (e.g., `lib/stock-audits.ts`)
- [ ] At least 3 stock audits are implemented
- [ ] Each stock audit has a name, description, and full task template
- [ ] Templates follow the task file format (Goals, Blocked By, Definition of Done)
- [ ] Stock audits are exported and used by the audit command
