# Primitive Obsession Audit

Add a stock audit that identifies repeated domain literals and untyped primitives that should be modeled explicitly.

## Current State

There is no dedicated stock audit for primitive obsession.

Current examples:
- Artifact directory strings are repeated in multiple modules (`lib/validation/index.ts`, `lib/cli/commands/lint-markdown.ts`, `lib/lint/validators/directory-validator.ts`, `lib/cli/commands/list.ts`, `lib/cli/commands/init.ts`).
- The project already has `ArtifactType` (`lib/artifacts/index.ts`), but many call sites still use free-form arrays of string literals.

This creates drift risk and weak compile-time guarantees.

## Proposed Audit

Add a stock audit named `primitive-obsession` in `lib/audits/stock-audits.ts`.

Template focus:
1. Repeated string literal unions that represent domain concepts
2. Numeric magic values lacking named constants
3. APIs using broad primitives where narrow domain types already exist
4. Recommendations for centralizing constants or introducing shared types

Required output per finding:
- Location(s)
- Primitive pattern
- Existing domain type/constant opportunity
- Suggested migration path

## Relationship to Existing Audits

- Complements `naming-consistency` (semantic alignment) with type-level alignment.
- Complements `refactoring-opportunities` by focusing specifically on domain modeling.

## Open Questions

### Should this audit prioritize literals with existing type definitions?

#### Option: Prioritize existing-type drift

Start with places where a domain type already exists but is bypassed.

#### Option: Include all primitive candidates

Cover broader opportunities, including introducing new domain types.

### Should numeric thresholds be part of scope in v1?

#### Option: Yes, include numeric magic values

Catches both string and number primitive obsession in one audit.

#### Option: No, start with strings and enums only

Keeps first version narrower and easier to run consistently.
