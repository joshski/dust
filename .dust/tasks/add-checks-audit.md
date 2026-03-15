# Add Checks Audit

Add a stock audit that suggests appropriate checks for the repository's tech stack. The audit analyzes the project's technology ecosystem and creates ideas for missing check categories.

## Context

When dust is added to a repository via `dust init`, only minimal checks are configured automatically. The existing `generateSettings()` in `lib/cli/commands/init.ts` detects a test command via lockfile detection and adds a single "test" check. This leaves repositories under-protected compared to their potential quality gate coverage.

The audit will leverage and extend the existing tech stack detection in `lib/config/settings.ts` which already identifies JavaScript, Ruby, Python, Go, Rust, PHP, and Elixir ecosystems.

## Implementation Approach

Following Functional Core, Imperative Shell:

**Functional Core** (pure functions):
- `detectTechStack(projectFiles: string[])` - Returns detected ecosystems based on config files and lockfiles
- `detectConfiguredChecks(settings: DustSettings)` - Extracts check categories from existing configuration
- `detectCIChecks(ciFiles: CIFileContent[])` - Parses CI configs to find what checks run there
- `suggestChecks(stack: TechStack, configured: Set<string>, ciChecks: Set<string>)` - Returns suggestions for missing checks
- `renderCheckIdea(suggestion: CheckSuggestion)` - Produces markdown content for an idea file

**Imperative Shell**:
- The stock audit template function that orchestrates detection and idea creation
- File system operations handled by existing audit infrastructure

## Check Categories by Tech Stack

### JavaScript/TypeScript
| Category | Detection | Check Options |
|----------|-----------|---------------|
| Linting | `.eslintrc*`, `biome.json`, `oxlint` in deps | `eslint`, `oxlint`, `biome lint` |
| Formatting | `.prettierrc*`, `biome.json` | `prettier`, `oxfmt`, `biome format` |
| Type checking | `tsconfig.json` | `tsc --noEmit` |
| Build | `build` script in package.json | `npm run build`, `bun run build` |
| Unit tests | `test` script, `vitest.config.*`, `jest.config.*` | `npm test`, `vitest`, `jest` |
| Unused code | `knip.json` or in deps | `knip` |
| Coverage | Coverage config in vitest/jest | `vitest --coverage`, `jest --coverage` |

### Python
| Category | Detection | Check Options |
|----------|-----------|---------------|
| Linting | `ruff.toml`, `pyproject.toml [tool.ruff]` | `ruff check`, `pylint` |
| Formatting | `ruff.toml`, `pyproject.toml [tool.black]` | `ruff format --check`, `black --check` |
| Type checking | `pyproject.toml [tool.mypy]`, `pyrightconfig.json` | `mypy`, `pyright` |
| Unit tests | `pytest.ini`, `pyproject.toml [tool.pytest]` | `pytest` |
| Coverage | `[tool.coverage]` in pyproject.toml | `pytest --cov` |

### Go
| Category | Detection | Check Options |
|----------|-----------|---------------|
| Linting | `.golangci.yml` | `golangci-lint run` |
| Formatting | (always suggest) | `gofmt -l .` |
| Build | `go.mod` | `go build ./...` |
| Unit tests | `*_test.go` files | `go test ./...` |
| Coverage | (suggest with threshold) | `go test -cover ./...` |
| Vetting | (always suggest) | `go vet ./...` |

### Rust
| Category | Detection | Check Options |
|----------|-----------|---------------|
| Linting | `clippy.toml` or Cargo.toml | `cargo clippy` |
| Formatting | `rustfmt.toml` | `cargo fmt --check` |
| Build | `Cargo.toml` | `cargo build` |
| Unit tests | `Cargo.toml` | `cargo test` |

## CI Detection

The audit should detect CI configuration files:
- `.github/workflows/*.yml` - GitHub Actions
- `.gitlab-ci.yml` - GitLab CI
- `.circleci/config.yml` - CircleCI
- `Jenkinsfile` - Jenkins

When CI checks are found that aren't in dust config, create ideas noting the discrepancy so users can align their local and CI checks.

## Output Format

For each missing check category, create an idea file. Example for a TypeScript project missing linting:

```markdown
# Add Linting Check

Add a linting check to the dust configuration.

## Detected Stack

- TypeScript project (tsconfig.json present)
- Bun package manager (bun.lock present)
- ESLint configuration found (.eslintrc.json)

## Suggested Check

Add to `.dust/config/settings.json`:

{
  "name": "lint",
  "command": "bunx eslint .",
  "hints": ["Run `bunx eslint .` to see lint diagnostics"]
}

## Alternatives

- `bunx oxlint .` - Fast, zero-config linting
- `bunx biome lint .` - All-in-one linting and formatting
```

## Multiple Ecosystem Handling

When multiple ecosystems are detected (e.g., Python backend + JavaScript frontend), create separate ideas for each ecosystem's checks. Each idea should clearly indicate which part of the project it applies to.

## Principles

- [Batteries Included](../principles/batteries-included.md) - Dust should provide everything required for an agent to be productive
- [Easy Adoption](../principles/easy-adoption.md) - Help users configure checks without deep research into each tool
- [Stop the Line](../principles/stop-the-line.md) - Comprehensive checks catch problems at source
- [Lint Everything](../principles/lint-everything.md) - Static analysis should cover as much as possible
- [Comprehensive Test Coverage](../principles/comprehensive-test-coverage.md) - Tests are critical for agent confidence
- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md) - Pure detection and suggestion logic separated from I/O

## Blocked By

(none)

## Definition of Done

- [ ] Stock audit added to `lib/audits/stock-audits.ts` with name `checks-audit`
- [ ] Pure functions for tech stack detection based on config files
- [ ] Pure functions for suggesting checks based on detected stack
- [ ] CI configuration detection for GitHub Actions, GitLab CI, CircleCI, Jenkins
- [ ] Audit creates ideas for missing check categories
- [ ] Multiple ecosystem detection creates separate ideas per ecosystem
- [ ] Unit tests for all pure detection and suggestion functions
- [ ] Running `dust audit checks-audit` works end-to-end
