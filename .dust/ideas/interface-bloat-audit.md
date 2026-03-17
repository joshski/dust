# Interface Bloat Audit

Add a stock audit that finds large interfaces/types that mix unrelated concerns.

## Current State

There is no stock audit dedicated to oversized or mixed-concern type contracts.

Current examples:
- `TerminalUIState` in `lib/bucket/terminal-ui.ts:140-160` has 10 fields spanning repository data, UI selection state, scrolling, layout, and connection metadata.
- `BucketState` in `lib/cli/commands/bucket-worker.ts:209-222` has 12 fields spanning WebSocket connection, repository state, reconnection logic, session management, event emission, UI state, and tools.

Large cross-cutting interfaces increase coupling and make change-scoping harder.

## Proposed Audit

Add a stock audit named `interface-bloat` in `lib/audits/stock-audits.ts`.

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

## Lint Rule Feasibility

Field-count detection is technically feasible as a lint rule:
- The codebase has a custom policy checker (`lib/lint/policy-checker.ts`) using TypeScript AST
- `ts.isInterfaceDeclaration` and `ts.isTypeAliasDeclaration` can identify types
- Member counting is straightforward via AST traversal

However, detecting "mixed concerns" is inherently semantic rather than syntactic—a lint rule can flag field counts but cannot determine whether fields represent separate concerns without heuristics or annotations. This suggests:
- A lint rule could serve as a **pre-filter** (flag candidates above threshold)
- The audit provides **semantic analysis** (confirm mixed concerns, suggest decomposition)

## Open Questions

### Should field-count detection be a lint rule or audit-only?

#### Option: Lint rule as pre-filter

Add a custom policy check (e.g., `no-large-interfaces`) that flags interfaces above a threshold (default 8-10 fields). The audit then provides semantic analysis for flagged types. Benefits: immediate feedback during development; aligns with "Lint Everything" principle.

#### Option: Audit-only

Keep all interface-bloat detection in the audit. The audit uses field count as one heuristic among others but doesn't expose it as a lint rule. Benefits: avoids false positives from legitimate large interfaces; keeps lint output focused.

#### Option: Lint rule with escape hatch

Add the lint rule but allow suppression via comment (e.g., `// dust-ignore no-large-interfaces -- state container`). Flagged types without suppression are audit candidates. Benefits: explicit acknowledgment of large interfaces; documented rationale.

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
