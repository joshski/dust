# Built in "agent-friendly" lints

Provide built-in lints for codebase aspects that affect agent developer experience. Users can check their code for basic metrics without installing third-party linting tools.

## Background

The [Context-Optimised Code](../principles/context-optimised-code.md) goal states that "dust should help projects identify files that are too large, modules that are too tangled, and patterns that make agent comprehension harder than it needs to be." Currently, dust only lints its own `.dust/` markdown files via `dust lint`. To check code quality metrics, users must configure external tools (FTA, ESLint complexity rules, etc.) in their `settings.json` checks.

This creates friction for new adopters. The [Easy Adoption](../principles/easy-adoption.md) goal emphasizes that "a developer should be able to bootstrap Dust in their repository with a single command, without needing to install dependencies, configure build tools, or understand the internals."

## Proposed Solution

Add a new command (e.g., `dust lint-code` or extend `dust lint`) that checks source files for agent-unfriendly patterns. These would be simple, language-agnostic metrics that work across any codebase:

### Candidate Metrics

1. **File line count** - Flag files exceeding a threshold (e.g., 500 lines). Large files cannot fit in agent context windows.

2. **Function/method length** - Flag functions exceeding a threshold. Long functions require more context to understand.

3. **Nesting depth** - Flag deeply nested code blocks. Deep nesting increases cognitive load for agents.

4. **Import/dependency count** - Flag files with many imports. Heavy dependencies mean understanding one file requires loading many others.

5. **File naming patterns** - Flag non-conventional filenames (e.g., inconsistent casing, unclear names).

## Relationship to FTA Integration

The [Integrate FTA](integrate-fta.md) idea proposes using FTA (Fast TypeScript Analyzer) for TypeScript-specific complexity analysis. This idea differs in scope:

- **FTA integration**: TypeScript-specific, requires `bunx fta-cli`, provides detailed complexity scores
- **Built-in lints**: Language-agnostic, zero dependencies, simple metrics only

These ideas are complementary. Built-in lints provide baseline checks that work everywhere, while FTA (or similar tools) provide deeper analysis for specific languages.

## Goal Alignment

- [Lint Everything](../principles/lint-everything.md) - Extends static analysis to source code structure
- [Context-Optimised Code](../principles/context-optimised-code.md) - Directly supports identifying files that don't fit agent context
- [Easy Adoption](../principles/easy-adoption.md) - Zero-config, no external dependencies required
- [Fast Feedback Loops](../principles/fast-feedback-loops.md) - Simple checks run quickly

## Open Questions

### Which metrics should be included in an initial implementation?

#### File line count only

Start with the simplest, most universal metric. Easy to implement and understand. Thresholds are straightforward to configure.

#### File line count plus function length

Add basic function detection using regex patterns (works for most C-style languages). Increases coverage without major complexity.

#### All proposed metrics

Implement file count, function length, nesting depth, and import count. Provides comprehensive coverage but increases implementation scope and may produce noisy results.

### How should thresholds be configured?

#### Fixed defaults with settings.json overrides

Ship sensible defaults (e.g., 500 lines per file). Users can override in `.dust/config/settings.json`. Balances simplicity with flexibility.

#### No configurability initially

Use fixed thresholds. Keeps implementation simple. Add configuration later if users request it.

#### Per-directory or per-glob configuration

Allow different thresholds for different parts of the codebase (e.g., test files might reasonably be longer). More flexible but significantly more complex.

### Should these checks run as part of `dust check` by default?

#### Opt-in via settings.json

Users must explicitly enable code linting checks. Avoids surprising failures for existing projects that adopt dust.

#### Enabled by default with opt-out

Run automatically when the command exists. Follows "lint everything" philosophy but may frustrate users with many violations.

#### Separate command only

`dust lint-code` is always manual, never part of `dust check`. Keeps the check pipeline predictable.

### How should language-specific parsing be handled?

#### Regex-based heuristics

Use simple patterns to detect functions/classes (e.g., `function\s+\w+`, `def\s+\w+`, `class\s+\w+`). Works reasonably well across languages without adding dependencies.

#### Line-based metrics only

Skip function detection entirely. Only check file-level metrics (line count, import count via import/require patterns). Simplest approach with no parsing complexity.

#### Tree-sitter integration

Use tree-sitter for accurate parsing across languages. Adds a significant dependency but provides precise metrics.
