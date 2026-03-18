# Less nullables and optionals

Remove optional or nullable properties and arguments where making them mandatory reduces defensive code.

## Current State

### Optional callback parameters require defensive chaining

Many functions accept optional callback parameters and use optional chaining (`?.`) at every call site. For example, `onAgentEvent` in `lib/loop/iteration.ts` is called with `onAgentEvent?.({...})` at lines 138, 152, 159, 183, 190, 198, 206, 220, 243, 258, 264, 287, 302, 308. A no-op function default would eliminate all these defensive calls.

### IterationOptions has many optional properties with defaults

`IterationOptions` in `lib/loop/iteration.ts:88-102` contains 9 optional properties that are all given defaults via destructuring or nullish coalescing. These could be mandatory with defaults provided at construction time.

### PrincipleInput uses optional + nullable combination

`PrincipleInput` in `lib/patch/principle.ts:5-10` has three properties (`body?`, `parentPrinciple?: string | null`, `subPrinciples?`) that are optional but always get default values via `?? null` and `?? []` in `serializePrinciple()`.

### RepositoryDependencies has many optional function properties

`RepositoryDependencies` in `lib/bucket/repository.ts:94-117` has 7 optional function properties (`dockerDeps?`, `getTools?`, `getRevealedFamilies?`, `forwardToolExecution?`, `revealFamily?`, `shellRunner?`). These are called with optional chaining or nullish coalescing throughout the codebase.

### Environment config properties are all nullable

All properties in `lib/env-config.ts` interfaces (`LoggingConfig`, `BucketConfig`, `SessionConfig`, `RuntimeConfig`, `AgentDetectionConfig`, `AuthConfig`, `TestingConfig`) use `string | undefined` for every field. This propagates defensive checks downstream.

### Repository interface has optional properties

`Repository` in `lib/bucket/repository.ts:62-70` has `agentProvider?` and `branch?` optional properties that require `?? '(default)'` or `?? '(unset)'` when displayed.

## Patterns to Address

### No-op function defaults

When a callback parameter like `onRawEvent` or `onAgentEvent` is optional, pass a no-op function (`() => {}`) as the default rather than `undefined`. This eliminates all optional chaining at call sites.

### Builder or factory defaults

For configuration objects like `IterationOptions`, provide a factory function that returns a complete object with all properties filled with sensible defaults. Callers can then override specific properties.

### Mandatory with fallback at construction

For properties like `PrincipleInput.parentPrinciple` that always get a default, make the property mandatory and apply the default at construction time rather than at every use site.

### Environment validation at startup

For environment variables that are truly required, validate at startup and throw early rather than propagating `undefined` through the system. For optional ones, convert to explicit fallback values at read time.

## Open Questions

### Should callback parameters default to no-op functions or require explicit passing?

#### Default to no-op functions

Provide `() => {}` as the default value for optional callbacks. This eliminates all `?.` chains at call sites and simplifies the code. Callers who want callbacks must explicitly pass them.

#### Keep callbacks optional with undefined

Keep the current pattern of optional callbacks with `undefined` defaults. This makes it explicit when a callback is not provided and allows callers to easily check whether callbacks are in use.

### How should configuration objects handle defaults?

#### Factory functions with complete defaults

Provide `createDefaultIterationOptions()` functions that return fully-populated objects. Callers spread their overrides: `{ ...createDefaultIterationOptions(), logger: myLogger }`.

#### Keep optional properties with spread defaults

Keep the current pattern of optional properties with defaults applied via destructuring or nullish coalescing. This is more flexible but spreads default logic across the codebase.

### Should environment variables validate early or propagate undefined?

#### Validate at startup and fail early

Read all required environment variables at startup, throw if missing. Optional variables get explicit fallback values assigned immediately. Downstream code never sees `undefined`.

#### Keep lazy validation with undefined propagation

Keep the current pattern where environment variables are `string | undefined` and validation happens when values are used. This allows more flexibility but requires defensive checks everywhere.
