# Audit Template Interpolation

Stock audits would benefit from mentioning dust commands (e.g., `dust principles`, `dust facts`) instead of raw directory paths. However, the runtime detection for which dust command to use (`bunx dust`, `npx dust`, etc.) is not available when audits are consumed via the exported npm package by downstream applications that don't have filesystem access to the repository.

## Context

### Current State

Stock audits in `lib/audits/stock-audits.ts` reference artifact directories directly:

- `factsVerification()`: "Read each fact file in `.dust/facts/`"
- `ideasFromPrinciples()`: "Read each principle file in `.dust/principles/`"
- `ideasHint` constant: "Review existing ideas in `./.dust/ideas/`..."

### Runtime Detection

The codebase has runtime detection for the appropriate dust command in `lib/config/settings.ts`:

```typescript
export function detectDustCommand(cwd, fileSystem): string {
  if (fileSystem.exists(join(cwd, 'bun.lockb'))) return 'bunx dust'
  if (fileSystem.exists(join(cwd, 'pnpm-lock.yaml'))) return 'pnpx dust'
  if (fileSystem.exists(join(cwd, 'package-lock.json'))) return 'npx dust'
  if (process.env.BUN_INSTALL) return 'bunx dust'
  return 'npx dust'
}
```

This works for CLI commands where `DustSettings.dustCommand` is available, but not for downstream consumers using the audits API.

### Export Path

The audits are exported via `@joshski/dust/audits`:

```typescript
import { loadStockAudits } from "@joshski/dust/audits"
const audits = loadStockAudits()
```

Downstream consumers (e.g., a web app using the GitHub API) receive static audit templates without access to the repository's lockfiles for runtime detection.

### Related Idea

The idea in `promote-dust-commands-over-directory-exploration.md` proposes using a `{bin}` template variable that resolves to the configured dust command. This pattern is already used in `lib/cli/commands/agent-shared.ts` via `TemplateVars.bin`.

## Proposed Approaches

### Approach A: Early Agent Instruction

Add guidance early in agent sessions that any mention of `dust` should be executed using the appropriate package runner (e.g., `bunx dust`, `npx dust`). This avoids modifying audit templates entirely.

**Pros:**
- No changes to audit templates or API
- Simple to implement in agent command instructions
- Agents are already context-aware and can adapt

**Cons:**
- Relies on agent interpretation rather than explicit instructions
- May not work consistently across all agents
- Audits consumed outside agent contexts won't benefit

### Approach B: Template Variable Interpolation

Modify audit templates to use `{bin}` placeholders and expose an interpolation API:

```typescript
// In stock-audits.ts
const ideasHint = 'Run `{bin} ideas` to understand what has been proposed...'

// Export interpolation function
export function interpolateAudit(template: string, vars: { bin: string }): string
```

**Pros:**
- Explicit and consistent
- Works in any context where the caller knows the dust command
- Aligns with existing `TemplateVars` pattern

**Cons:**
- Breaking change for consumers expecting raw templates
- Requires callers to provide the `bin` value

### Approach C: Default Command with Override

Use a generic `dust` command in templates by default, with documentation that consumers should configure their agent environment:

```typescript
const ideasHint = 'Run `dust ideas` to understand what has been proposed...'
```

**Pros:**
- Simple templates, no interpolation needed
- Works out of the box if `dust` is in PATH
- Consumers can alias or configure as needed

**Cons:**
- May not work in environments where `dust` isn't directly available
- Shifts complexity to environment setup

## Open Questions

### Should audit templates reference dust commands at all?

#### Option: Yes - commands provide richer output
Dust commands like `dust principles` and `dust facts` provide hierarchical, formatted output that helps agents understand content at a glance, rather than requiring them to glob and read individual files.

#### Option: No - keep templates environment-agnostic
Directory paths work universally without requiring any specific binary to be available. Agents can always read files directly.

### How should downstream consumers specify the dust command?

#### Option: Interpolation at call site
Consumers pass the dust command when loading audits, and templates are interpolated:
```typescript
const audits = loadStockAudits({ bin: 'bunx dust' })
```

#### Option: Return templates with placeholders
Consumers receive templates with `{bin}` placeholders and handle interpolation themselves:
```typescript
const audits = loadStockAudits()
const interpolated = audits[0].template.replace(/{bin}/g, 'bunx dust')
```

#### Option: Agent-level configuration
Don't modify the audits API; instead, instruct agents early in the session about command invocation.

### Should this be combined with the promote-commands idea?

#### Option: Yes - implement together
Both ideas involve replacing directory references with command invocations in templates. Implementing them together ensures consistency.

#### Option: No - separate concerns
The promote-commands idea focuses on workflow tasks where `DustSettings` is available. This idea focuses on the audits API where settings may not be available. Different solutions may be appropriate.

## Related

- [Promote dust commands over directory exploration](./promote-dust-commands-over-directory-exploration.md)
- [Package Exports](../facts/package-exports.md)
- [Agent-Agnostic Design](../principles/agent-agnostic-design.md)
