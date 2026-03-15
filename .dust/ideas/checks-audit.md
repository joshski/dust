# Checks Audit

Add a stock audit that suggests appropriate checks for the repository's tech stack. The audit creates ideas for missing check categories.

## Context

When dust is added to a repository via `dust init`, only minimal checks are configured automatically. Currently, `generateSettings()` in `lib/cli/commands/init.ts` detects a test command via lockfile detection and adds a single "test" check. This leaves repositories under-protected compared to their potential quality gate coverage.

The existing tech stack detection in `lib/config/settings.ts` already identifies:
- JavaScript ecosystems (bun, pnpm, npm, yarn)
- Ruby (Gemfile.lock)
- Python (poetry, pipenv, requirements.txt)
- Go (go.sum)
- Rust (Cargo.lock)
- PHP (composer.lock)
- Elixir (mix.lock)

This detection can be extended to suggest ecosystem-specific checks beyond just test commands.

## Proposed Behavior

The audit would:

1. **Detect the tech stack** by examining lockfiles, config files, and project structure
2. **Identify existing checks** from `.dust/config/settings.json`
3. **Suggest missing checks** appropriate for the detected stack
4. **Create ideas** for each suggested check category not currently configured

## Check Categories by Tech Stack

### JavaScript/TypeScript

| Category | Check Options |
|----------|---------------|
| Linting | `eslint`, `oxlint`, `biome lint` |
| Formatting | `prettier`, `oxfmt`, `biome format` |
| Type checking | `tsc --noEmit` (if tsconfig.json exists) |
| Build | `npm run build`, `bun run build` (if build script in package.json) |
| Unit tests | `npm test`, `bun test`, `vitest`, `jest` |
| Unused code | `knip` |
| Coverage | `vitest --coverage`, `jest --coverage`, `c8` |

### Python

| Category | Check Options |
|----------|---------------|
| Linting | `ruff`, `pylint`, `flake8` |
| Formatting | `ruff format --check`, `black --check` |
| Type checking | `mypy`, `pyright` |
| Unit tests | `pytest`, `python -m unittest` |
| Coverage | `pytest --cov`, `coverage run` |

### Go

| Category | Check Options |
|----------|---------------|
| Linting | `golangci-lint run` |
| Formatting | `gofmt -l .` |
| Build | `go build ./...` |
| Unit tests | `go test ./...` |
| Coverage | `go test -cover ./...` |
| Vetting | `go vet ./...` |

### Rust

| Category | Check Options |
|----------|---------------|
| Linting | `cargo clippy` |
| Formatting | `cargo fmt --check` |
| Build | `cargo build` |
| Unit tests | `cargo test` |

### Ruby

| Category | Check Options |
|----------|---------------|
| Linting | `rubocop` |
| Unit tests | `rspec`, `rake test` |

## Audit Output

For each missing check category, the audit would create an idea file. For example, if linting is not configured in a TypeScript project:

```markdown
# Add Linting Check

Add a linting check to the dust check configuration.

## Detected Stack

- TypeScript project (tsconfig.json present)
- Bun package manager (bun.lock present)

## Suggested Check

Add to `.dust/config/settings.json`:

{
  "name": "lint",
  "command": "bunx oxlint .",
  "hints": ["Run `bunx oxlint .` to see lint diagnostics"]
}

## Alternatives

- `bunx eslint .` - More configurable, widely adopted
- `bunx biome lint .` - All-in-one linting and formatting
```

## Related Code

- `lib/config/settings.ts:246-274` - `LOCKFILE_COMMANDS` defines detected ecosystems
- `lib/cli/commands/init.ts:21-31` - `generateSettings()` creates initial check config
- `lib/audits/stock-audits.ts` - Stock audit template functions
- `lib/audits/index.ts` - Audit loading and execution

## Principle Alignment

- [Batteries Included](../principles/batteries-included.md) - Dust should provide everything required for an agent to be productive
- [Easy Adoption](../principles/easy-adoption.md) - Help users configure checks without deep research into each tool
- [Stop the Line](../principles/stop-the-line.md) - Comprehensive checks catch problems at source
- [Lint Everything](../principles/lint-everything.md) - Static analysis should cover as much as possible
- [Comprehensive Test Coverage](../principles/comprehensive-test-coverage.md) - Tests are critical for agent confidence

## Open Questions

### How should the audit detect which tools are available?

#### Check for config files

Look for tool configuration files (`.eslintrc`, `pyproject.toml` with `[tool.ruff]`, etc.) to infer which tools the project already uses. Suggest checks using those tools first.

#### Check for installed dependencies

Parse `package.json` devDependencies, `pyproject.toml` dev-dependencies, etc. to see which linters/formatters are already installed.

#### Suggest based on ecosystem norms

Skip detection and suggest the most commonly used tools for each ecosystem. Simpler but may suggest tools the user doesn't want.

#### Combination approach

First check for config files, then installed dependencies, then fall back to ecosystem norms. Most accurate but more complex implementation.

### Should the audit also detect CI configuration?

#### Include CI detection

Check for `.github/workflows/`, `.gitlab-ci.yml`, etc. and cross-reference what checks run in CI versus what's configured in dust. Creates ideas for checks that run in CI but aren't in dust (and vice versa).

#### Exclude CI detection

Keep this audit focused on local check configuration. CI configuration is a separate concern covered by the [Warn When CI Does Not Run dust check](warn-when-ci-does-not-run-dust-check.md) idea.

### How should coverage requirements be handled?

#### Suggest coverage check with configurable threshold

Generate a coverage check that can be configured with a threshold (e.g., 80% or 100%). Users can adjust in settings.json.

#### Suggest coverage check without threshold enforcement

Suggest running tests with coverage reporting but don't fail on percentage. Visibility without enforcement.

#### Let users decide thresholds via follow-up ideas

Create an idea that discusses coverage thresholds, letting the user decide what's appropriate for their project. The audit doesn't prescribe a number.

### What happens when multiple ecosystems are detected?

#### Create separate ideas per ecosystem

If both Python and JavaScript are detected, create separate ideas for each ecosystem's checks. Let the user decide which apply.

#### Warn and skip

Detect the conflict and create a single idea noting that multiple ecosystems were found, requiring manual configuration.

#### Use primary ecosystem heuristics

Use heuristics to determine the "primary" ecosystem (e.g., check which has more files) and focus suggestions there.
