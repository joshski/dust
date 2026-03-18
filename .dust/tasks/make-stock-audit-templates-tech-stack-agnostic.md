# Make Stock Audit Templates Tech-Stack Agnostic

Remove hardcoded tool commands and ecosystem-specific examples from stock audit templates in `lib/audits/stock-audits.ts`.

## Context

Several stock audit templates embed JavaScript/npm-specific commands that provide irrelevant guidance when running on Python, Go, or Rust projects. This wastes context window space and creates cognitive load for agents that must translate or ignore inapplicable instructions.

The affected audits include:
- `feedbackLoopSpeed()` — contains `npx vitest`, `jest`, `bun test`, `npm run build`
- `securityReview()` — contains `npm audit`, `yarn audit`, `bun audit`
- `slowTests()` — contains `npm test -- --reporter=verbose`
- `testPyramid()` — contains `npx vitest run --reporter=json`, `jest --json`

## Implementation

For each affected audit template:

1. Replace specific tool commands with instructions to discover the appropriate command
2. Keep conceptual categories (linting, testing, formatting) without specifying tools
3. Trust agents to identify the project's test framework and run the appropriate command

Example transformation for `feedbackLoopSpeed()`:

**Before:**
```markdown
### 2. Measure Test Suite Timing

Depending on the test framework:

- **Vitest**: Run `npx vitest run --reporter=verbose` to see per-test timing
- **Jest**: Run `jest --verbose` or `jest --json` for timing data
- **Bun test**: Run `bun test --verbose` and parse output
```

**After:**
```markdown
### 2. Measure Test Suite Timing

1. Identify the test framework used in this project (examine build config, test config files, or CI configuration)
2. Run the test suite with verbose/timing output enabled (most frameworks support this)
3. Extract per-test duration data from the output
```

Apply the same pattern to all tech-stack specific sections in the affected audits.

## Principles

- [Agent Autonomy](../principles/agent-autonomy.md)
- [Context Window Efficiency](../principles/context-window-efficiency.md)
- [Agent-Agnostic Design](../principles/agent-agnostic-design.md)

## Blocked By

(none)

## Definition of Done

- `feedbackLoopSpeed()` contains no ecosystem-specific tool commands
- `securityReview()` contains no ecosystem-specific tool commands
- `slowTests()` contains no ecosystem-specific tool commands
- `testPyramid()` contains no ecosystem-specific tool commands
- Audit templates instruct agents to discover appropriate commands rather than prescribing them
- `bin/dust check` passes
