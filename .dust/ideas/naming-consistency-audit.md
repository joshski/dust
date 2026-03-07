# Naming Consistency Audit

Add a stock audit that checks naming consistency for constructors/factories and shared concepts.

## Current State

The stock `ubiquitous-language` audit targets terminology drift, but it does not explicitly audit API-shape naming consistency in code.

Current examples:
- `build*` and `create*` are both used for factory-style functions: `buildArtifactsRepository`, `buildAuditsRepository`, `buildUnattendedEnv`, and many `create*` constructors.
- Artifact directory literals (`principles`, `facts`, `ideas`, `tasks`) are named/ordered differently across modules (`lib/validation/index.ts`, `lib/cli/commands/lint-markdown.ts`, `lib/lint/validators/directory-validator.ts`, `lib/cli/commands/list.ts`).

Inconsistent naming increases lookup and onboarding friction.

## Proposed Audit

Add a stock audit named `naming-consistency` in `lib/audits/stock-audits.ts`.

Template focus:
1. Inconsistent naming patterns for equivalent abstractions (factory/build/create/get/load)
2. Drift in canonical term usage across code and docs
3. Repeated concept lists with inconsistent ordering/shape
4. Recommendations to standardize names without churn-only renames

Required output per finding:
- Location(s)
- Inconsistent term set
- Chosen canonical name proposal
- Migration strategy (incremental or one-shot)

## Relationship to Existing Audits

- Extends `ubiquitous-language` into code-level API naming patterns.
- Complements `component-reuse` by reducing semantic duplication (same concept, multiple names).

## Open Questions

### Should this be a new audit or an expansion of `ubiquitous-language`?

#### Option: New `naming-consistency` audit

Keeps low-level code naming analysis distinct from broader terminology checks.

#### Option: Extend `ubiquitous-language`

Avoids audit sprawl and keeps all naming concerns in one place.

### How aggressive should rename recommendations be?

#### Option: High-confidence only

Only suggest renames where equivalence is clear and migration cost is low.

#### Option: Broad standardization

Suggest full consistency sweeps even when migration spans many files.
