# Interface Bloat Audit

Add a stock audit that finds large interfaces/types that mix unrelated concerns.

## Current State

There is no stock audit dedicated to oversized or mixed-concern type contracts.

Current examples:
- `TerminalUIState` in [`lib/bucket/terminal-ui.ts`](../../lib/bucket/terminal-ui.ts) (`140-160`) has 10 fields spanning repository data, UI selection state, scrolling, layout, and connection metadata.
- `BucketState` in [`lib/cli/commands/bucket.ts`](../../lib/cli/commands/bucket.ts) similarly coordinates connection lifecycle, repositories, pending tool execution, and UI integration.

Large cross-cutting interfaces increase coupling and make change-scoping harder.

## Proposed Audit

Add a stock audit named `interface-bloat` in [`lib/audits/stock-audits.ts`](../../lib/audits/stock-audits.ts).

Template focus:
1. Interfaces/types with high field counts and mixed domains
2. Optional fields that indicate mode-specific state in one type
3. Contracts passed widely across subsystems
4. Refactor options (split into sub-state, composition, mode-specific unions)

Required output per finding:
- Type name + location
- Concern groups mixed into the type
- Coupling impact
- Suggested decomposition strategy

## Relationship to Existing Audits

- Complements `global-state` by targeting shape design rather than mutable singletons.
- Complements `single-responsibility-violations` at the type-system boundary.

## Open Questions

### What should be the default bloat threshold?

#### Option: Field-count heuristic

Flag interfaces with 8+ fields, then confirm mixed concerns manually.

#### Option: Concern-count heuristic

Flag only when 2+ unrelated concern groups are present, regardless of field count.

### Should this audit include type aliases and unions, or interfaces only?

#### Option: Interfaces and type aliases

Covers modern TypeScript patterns where large object types are often aliases.

#### Option: Interfaces first

Simpler and less noisy for initial rollout.
