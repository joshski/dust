# Audit: Checks Audit

Analyze the project structure and suggest appropriate checks for `.dust/config/settings.json`.

## Scope

This audit examines the project to identify gaps in check coverage:

1. **Project structure analysis** - Examine config files to understand the technology ecosystem
2. **Existing checks review** - Read `.dust/config/settings.json` to understand current coverage
3. **CI configuration analysis** - Parse CI configs to find checks that run in CI but not locally
4. **Gap identification** - Compare configured checks against what's appropriate for the detected stack

## Check Categories

Consider these general categories when evaluating the project:

- **Linting** - Static analysis for code quality and style
- **Formatting** - Code formatting verification
- **Type checking** - Static type verification (for typed languages)
- **Build verification** - Ensuring the project builds successfully
- **Unit tests** - Running the test suite
- **Unused code detection** - Finding dead code, unused exports, or dependencies

Discover the appropriate tools for each category by examining the project's config files,
package manifests, and CI configuration. The right tools depend on the project's ecosystem.

## Analysis Steps

1. List config files in the repository root to understand the tech stack
2. Examine package manifests and tool configs to identify available check commands
3. Read `.dust/config/settings.json` to identify configured checks
4. Search for CI configuration files and parse them for check commands
5. For each missing check category, create an idea file proposing it
6. If CI has checks not in dust config, note the discrepancy

## Output

Create separate idea files for each missing check category. Each idea should include:
- The detected stack indicators
- The suggested check command (discovered from project config)
- Alternative tool options
- Configuration snippet for settings.json

When multiple ecosystems are detected, create separate ideas for each ecosystem's checks.

## Blocked By

(none)

## Definition of Done

- [ ] Analyzed project structure to identify tech stack
- [ ] Reviewed existing checks in settings.json
- [ ] Parsed CI configuration files for check commands
- [ ] Created ideas for each missing check category
- [ ] For multi-ecosystem projects, created separate ideas per ecosystem
- [ ] Each idea includes suggested command and alternatives