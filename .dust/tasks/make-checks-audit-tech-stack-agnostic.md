# Make Checks-Audit Tech-Stack Agnostic

Extract tech stack detection to a shared utility and make the checks-audit template agnostic. Agents should discover appropriate checks rather than receiving ecosystem-specific tool prescriptions.

## Context

The `lib/audits/checks-audit.ts` module conflates two concerns:

1. **Tech stack detection** — Valuable infrastructure that identifies ecosystems based on config files (`package.json`, `go.mod`, `Cargo.toml`, etc.)
2. **Tool prescription** — Hardcoded lists of specific tools per ecosystem embedded in the audit template

The detection logic is reusable beyond audits, but embedding it in the audit template couples the audit to a fixed set of ecosystems. The `checksAuditTemplate()` function currently lists specific tools (ESLint, Vitest, Ruff, etc.) which become irrelevant or incomplete for ecosystems not in the hardcoded list.

## Implementation

### 1. Extract Tech Stack Detection

Move the following from `lib/audits/checks-audit.ts` to a new `lib/tech-stack/` module:

- `Ecosystem` type
- `TechStackDetection` interface
- `ECOSYSTEM_INDICATORS` constant
- `PACKAGE_MANAGER_FILES` constant
- `detectTechStack()` function

This makes detection available for other purposes while keeping the functional core pure.

### 2. Make the Audit Template Agnostic

Rewrite `checksAuditTemplate()` to:

1. Remove the hardcoded "Check Categories to Evaluate" section that lists ecosystem-specific tools
2. Instruct agents to examine the project structure and discover appropriate checks
3. Keep the conceptual check categories (linting, formatting, type-checking, testing, build) without specifying tools
4. Reference the extracted detection utility as available infrastructure without embedding its output in the template

### 3. Update Imports

The checks-audit module should import from the new `lib/tech-stack/` module. The pure functions (`detectTechStack`, `detectConfiguredChecks`, `suggestChecks`) remain available for programmatic use but their output doesn't appear in the audit template text.

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Agent Autonomy](../principles/agent-autonomy.md)
- [Context Window Efficiency](../principles/context-window-efficiency.md)
- [Decoupled Code](../principles/decoupled-code.md)

## Blocked By

(none)

## Definition of Done

- Tech stack detection types and functions live in `lib/tech-stack/`
- `lib/audits/checks-audit.ts` imports from `lib/tech-stack/`
- `checksAuditTemplate()` contains no ecosystem-specific tool lists
- Audit template instructs agents to discover appropriate checks
- Existing tests pass (update as needed for new module structure)
- `bin/dust check` passes
