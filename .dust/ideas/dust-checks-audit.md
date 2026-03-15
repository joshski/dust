# Dust checks audit

Add a stock audit that analyzes a repository's tech stack and suggests appropriate checks for `.dust/config/settings.json`.

## Context

When dust is added to a repository via `dust init`, the `generateSettings` function in `lib/cli/commands/init.ts` only auto-detects a test command (via `detectTestCommand` in `lib/config/settings.ts`). It doesn't suggest linting, type checking, compilation, formatting, code coverage, or other quality checks that may be appropriate for the project's tech stack.

The tech stack detection infrastructure already exists — `detectInstallCommand` in `lib/config/settings.ts` recognizes lockfiles for JavaScript (bun, pnpm, npm), Ruby, Python, Go, Rust, PHP, and Elixir ecosystems. This same detection could inform which checks are relevant.

The audit system (`lib/audits/stock-audits.ts`) provides a natural home for this. Stock audits are markdown templates that guide agents through analysis. The existing `test-coverage` audit already covers one aspect of quality gates, but no audit examines the full spectrum of checks a project should have.

## What the audit should cover

The audit template should instruct the agent to:

1. **Detect the tech stack** — examine lockfiles, config files, and project structure
2. **Review existing checks** — read `.dust/config/settings.json` and identify what's already configured
3. **Identify gaps** — compare configured checks against what's appropriate for the detected stack
4. **Create ideas** — for each missing check category, create an idea file proposing it

### Check categories to evaluate

For each detected ecosystem, the audit should consider:

- **Linting and static analysis** — ESLint/oxlint (JS/TS), Rubocop (Ruby), Ruff/Flake8 (Python), golangci-lint (Go), Clippy (Rust), PHPStan (PHP), Credo (Elixir)
- **Formatting** — Prettier/oxfmt (JS/TS), Black (Python), gofmt (Go), rustfmt (Rust), mix format (Elixir)
- **Type checking** — tsc (TypeScript), mypy/pyright (Python)
- **Compilation** — build commands for compiled languages (Go, Rust, TypeScript, Elixir)
- **Unit tests** — test runners appropriate to the ecosystem
- **System/integration tests** — separate test suites that validate end-to-end behavior
- **Code coverage** — coverage reporting with a target (the audit should consider whether 100% is appropriate for the project)
- **Unused code detection** — knip (JS/TS), deadcode (Go), or similar tools

## Implementation approach

This would be a new stock audit function in `lib/audits/stock-audits.ts`, following the same pattern as existing audits like `dataAccessReview` and `testCoverage`. The audit template would guide the agent through tech stack detection and gap analysis, then instruct it to create idea files for missing checks.

## Principle alignment

- [Batteries Included](../principles/batteries-included.md) — helps new dust adopters configure comprehensive checks without manual research
- [Lint Everything](../principles/lint-everything.md) — ensures static analysis is considered for every project
- [Make Changes with Confidence](../principles/make-changes-with-confidence.md) — comprehensive checks enable confident changes
- [Stop the Line](../principles/stop-the-line.md) — catches quality gaps before they become problems
- [Fast Feedback Loops](../principles/fast-feedback-loops.md) — well-configured checks provide fast feedback

## Open Questions

### Should the audit only create ideas, or also directly modify settings.json?

#### Only create ideas (recommended)

The audit creates idea files for each missing check category. A human or agent then reviews and implements each idea, which includes adding the check to `settings.json`. This is consistent with how other audits work — they identify issues and propose ideas, they don't directly change configuration.

#### Directly modify settings.json

The audit could add suggested checks directly to `settings.json`, perhaps with a `"disabled": true` flag or as comments. This is faster but bypasses the review step and doesn't match the audit pattern.

### How should the audit handle projects with multiple ecosystems?

#### Evaluate each ecosystem independently

If a project has both `package-lock.json` and `requirements.txt`, suggest checks for both JavaScript and Python. The agent should group ideas by ecosystem for clarity.

#### Focus on the primary ecosystem only

Detect the primary ecosystem (e.g., the one with the most code) and only suggest checks for that. Simpler but may miss important secondary stacks.

### Should 100% code coverage be the default recommendation?

#### Recommend 100% coverage as aspirational with pragmatic guidance

The audit should suggest 100% coverage as the target but note that the idea should include discussion of whether this is appropriate. Some projects (e.g., those with heavy I/O or UI code) may find 100% coverage impractical or not cost-effective.

#### Recommend ecosystem-appropriate coverage thresholds

Different ecosystems have different norms. The audit template could suggest ecosystem-specific thresholds (e.g., 90% for web apps, 100% for libraries) and let the agent adjust based on the project.
