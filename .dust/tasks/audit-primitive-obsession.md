# Audit: Primitive Obsession

Review high-confidence primitive obsession where call sites use free-form literals instead of canonical domain representations.

Review existing ideas in `./.dust/ideas/` to understand what has been proposed or considered historically, then create new idea files in `./.dust/ideas/` for any issues you identify, avoiding duplication.

## Scope

Focus only on two high-confidence slices:
- Existing-type drift for domain string concepts
- Numeric magic values where naming/domain wrappers would improve clarity

Existing-type drift scope:
- Call sites using free-form string literals where a canonical domain type already exists
- Cases where the existing domain type is bypassed (for example artifact directory names that should use `ArtifactType`)
- High-confidence matches where intent is clear and the existing type is directly applicable

Numeric magic value scope:
- Thresholds, limits, retries, and timing values whose domain meaning is clear at call sites
- High-confidence literals that would be clearer as named constants or existing domain wrappers
- Examples: retry counts like `3`, timeout values like `30_000`, batch limits like `100`

Out of scope:
- Proposing entirely new domain types in this slice
- Ambiguous literals where no canonical existing type or constant naming opportunity can be identified with high confidence
- Obvious local loop indices/counters and trivial literals like `0` or `1` where no domain meaning exists

## Analysis Steps

1. Identify domain string concepts with existing canonical types (enums, unions, branded strings, or shared constants)
2. Search for free-form string literals that represent those same concepts at call sites
3. Identify numeric literals used as thresholds, limits, retries, or timing values where domain meaning is clear
4. Keep only high-confidence findings (exclude ambiguous values and obvious local indices/counters)
5. Group duplicate call-site drift by concept to avoid repetitive findings
6. Preserve Functional Core, Imperative Shell boundaries in recommendations (pure matching/analysis logic separated from IO shell)
7. Recommend incremental migrations only; avoid speculative introduction of brand-new types

## Output

For each finding, provide:
- **Locations** - File paths and line numbers where primitive literals are used
- **Primitive pattern** - The free-form literal pattern currently used (string concept or numeric role)
- **Constant/type opportunity** - The canonical existing type or named constant/domain wrapper that should be used instead
- **Incremental migration path** - A safe sequence of steps to migrate call sites with minimal risk

For numeric findings specifically, include:
- **Locations** - File paths and line numbers for the numeric literals
- **Numeric pattern** - The repeated threshold/limit/retry/timing literal pattern
- **Constant/type opportunity** - A named constant or existing domain wrapper to encode intent
- **Incremental migration path** - Steps to introduce the constant/wrapper and migrate call sites safely

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Small Units](../principles/small-units.md)
- [Make the Change Easy](../principles/make-the-change-easy.md)
- [Naming Matters](../principles/naming-matters.md)

## Blocked By

(none)

## Definition of Done

- Reviewed high-confidence existing-type drift for domain string literals and numeric magic values
- Constrained findings to cases where canonical domain types or clear constant/wrapper opportunities already exist
- Documented each finding with locations, primitive pattern, constant/type opportunity, and incremental migration path
- Documented numeric findings with locations, numeric pattern, constant/type opportunity, and incremental migration path
- Preserved Functional Core, Imperative Shell boundaries in recommendations
- Avoided speculative introduction of entirely new types
- Proposed ideas for primitive obsession improvements identified