# Core Principles Reading API

Create a pure functional API for reading and filtering core principles from the installed dust package.

## Context

Downstream users need programmatic access to dust's core principles. The API should read principles from the package's bundled `.dust/principles/` directory, filter out Internal principles, and respect the user's exclude configuration.

## Scope

### Functional Core

Create `lib/artifacts/core-principles.ts` with pure functions:

- `listCorePrinciples(allPrinciples, config)` — returns slugs after filtering Internal and excluded
- `getCorePrincipleTree(allPrinciples, config)` — returns hierarchy after filtering
- `isInternalPrinciple(principleContent)` — checks for `## Applicability: Internal`

### Configuration

Add `excludeCorePrinciples` to settings schema in `lib/config/settings.ts`:

```typescript
excludeCorePrinciples?: string[]  // slugs to exclude
```

### Package Export

Add `@joshski/dust/core-principles` export to `package.json`:

```json
{
  "exports": {
    "./core-principles": {
      "import": "./dist/core-principles.js",
      "types": "./dist/artifacts/core-principles.d.ts"
    }
  }
}
```

### Imperative Shell

Create thin wrapper that:
1. Locates the package's `.dust/principles/` directory
2. Reads principle files
3. Calls pure functions with the data
4. Returns results

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Design for Testability](../principles/design-for-testability.md)

## Blocked By

(none)

## Definition of Done

- Pure functions for filtering principles are implemented with unit tests
- Config schema accepts `excludeCorePrinciples` array
- Package export `@joshski/dust/core-principles` works
- Internal principles are filtered from results
- Excluded principles are filtered from results
- `dust lint` and `dust check` pass
