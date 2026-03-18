# Make Audits Tech Stack Agnostic

Audits should instruct agents to discover the tech stack and act accordingly. Remove hardcoded tool commands and ecosystem-specific examples.

## Context

Stock audits currently contain numerous tech-stack specific references:

### checks-audit.ts

The `checks-audit.ts` module is the most heavily tech-stack coupled. It contains:

- **Ecosystem constants** - Hardcoded list of ecosystems (`javascript`, `python`, `go`, `rust`, `ruby`, `php`, `elixir`)
- **Indicator files** - Mapping of config files to ecosystems (e.g., `package.json` → JavaScript)
- **Package manager detection** - Specific lockfile patterns for npm, bun, pnpm, yarn
- **Tool commands** - Ecosystem-specific commands for linting, formatting, type-checking, and testing
- **Template generation** - `checksAuditTemplate()` embeds specific tool recommendations per ecosystem

This module conflates two concerns: (1) detecting what stack a project uses, and (2) suggesting appropriate checks. The detection logic is valuable infrastructure, but embedding it in a stock audit template couples the audit to a fixed set of ecosystems.

### Stock audit templates in stock-audits.ts

Several audit templates reference specific tools as examples:

| Audit | Tech-stack references |
|-------|----------------------|
| `feedbackLoopSpeed()` | `npx vitest run`, `jest --verbose`, `bun test`, `npx tsc`, `npx eslint`, `npm run build`, `bun run build` |
| `securityReview()` | `npm audit`, `yarn audit`, `bun audit`, `eslint-plugin-security`, `socket.dev` |
| `slowTests()` | `npm test`, vitest, jest frameworks |
| `testPyramid()` | `npx vitest run --reporter=json`, `jest --json`, `bun test` |
| `dependencyStaleness()` | `npm view`, `npm outdated`, npm package registry |
| `ciCheckParity()` | `eslint`, `vitest`, `jest`, `npm run`, package.json scripts |

### Impact on non-JavaScript projects

When these audits run on a Python, Go, or Rust project, they produce JavaScript-specific guidance that the agent must translate or ignore. This creates unnecessary cognitive load and wastes context window space.

## Proposed Approach

### Principle: Agent-driven discovery

Rather than embedding ecosystem knowledge in audit templates, instruct agents to:

1. **Discover the tech stack** - Examine the project for indicators (build files, lockfiles, language-specific configs)
2. **Research appropriate tools** - Based on discovered stack, identify relevant commands
3. **Act accordingly** - Execute the appropriate commands for this specific project

This aligns with [Agent Autonomy](../principles/agent-autonomy.md) and [Agent-Agnostic Design](../principles/agent-agnostic-design.md) — agents are capable of discovering context and adapting.

### Changes to stock audits

For each audit with tech-stack references:

1. **Remove hardcoded tool commands** - Replace specific commands with instructions to discover the appropriate command
2. **Add discovery guidance** - Instruct agents to examine the project structure
3. **Keep conceptual categories** - Retain references to check categories (linting, formatting, testing) without specifying tools

Example transformation for `feedbackLoopSpeed()`:

**Before:**
```
### 2. Measure Test Suite Timing

Depending on the test framework:

- **Vitest**: Run `npx vitest run --reporter=verbose` to see per-test timing
- **Jest**: Run `jest --verbose` or `jest --json` for timing data
- **Bun test**: Run `bun test --verbose` and parse output
```

**After:**
```
### 2. Measure Test Suite Timing

1. Identify the test framework used in this project (examine package.json scripts, test config files, or CI configuration)
2. Run the test suite with verbose/timing output enabled (most frameworks support this)
3. Extract per-test duration data from the output
```

### Changes to checks-audit.ts

The checks-audit module requires more substantial restructuring:

1. **Extract tech stack detection** - Move `detectTechStack()` and related types to a shared utility (this is useful beyond audits)
2. **Make the audit template generic** - Remove ecosystem-specific tool lists from `checksAuditTemplate()`
3. **Keep detection as helper** - The detection logic can remain available for agents to use, but shouldn't be embedded in the audit text

## Related Principles

- [Agent Autonomy](../principles/agent-autonomy.md) — Agents can discover and adapt to project context
- [Agent-Agnostic Design](../principles/agent-agnostic-design.md) — Avoid assumptions about specific agent capabilities
- [Batteries Included](../principles/batteries-included.md) — Provide useful guidance without being prescriptive about tools
- [Context Window Efficiency](../principles/context-window-efficiency.md) — Don't waste tokens on irrelevant tech stack examples

## Open Questions

### Should tech stack detection remain in checks-audit.ts?

#### Extract to shared utility

Move `detectTechStack()`, `ECOSYSTEM_INDICATORS`, and related logic to a shared module (e.g., `lib/tech-stack/`). This makes detection available for other purposes and separates detection from audit template generation.

#### Keep in checks-audit but don't embed in template

Keep the detection code in `checks-audit.ts` but change the template to instruct agents to discover the stack themselves. The detection code remains useful for programmatic consumers but doesn't appear in the audit text.

#### Remove detection entirely

Rely fully on agent discovery. This is the most agnostic approach but loses the value of curated indicator lists.

### How should example commands be handled?

#### Remove all examples

Audit templates contain no specific tool commands. Agents discover appropriate commands through project examination and documentation.

#### Keep examples as suggestions with "or equivalent" language

Include examples like "Run `npm test` or the equivalent command for your project's test runner" to provide concrete guidance while acknowledging variation.

#### Use a tech-stack-agnostic example project

Create examples that work for a hypothetical generic project, using placeholders like `<test-command>` or `<lint-command>`.

### Should there be ecosystem-specific audit variants?

#### Single agnostic audit

One audit per category that works across all ecosystems. Agents adapt based on discovered context.

#### Ecosystem-specific variants via user configuration

Keep the agnostic stock audits but allow users to create ecosystem-specific overrides in `.dust/config/audits/`. A JavaScript-focused team could add `checks-javascript.md` with specific tool recommendations.

#### Modular composition

Split audits into composable pieces: a base agnostic audit plus optional ecosystem-specific extensions that agents can combine.
