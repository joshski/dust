# Formalize Validator Pattern

Introduce a consistent `Validator` interface across all validation code to enable composition, chaining, and uniform error aggregation.

## Current State

Validators in `lib/lint/validators/` and `lib/validation/` have inconsistent signatures:

```typescript
// Different return types across validators
export function validateLinks(...): Violation[]
export function validateFilename(...): Violation[]
export function validateIdeaOpenQuestions(...): void  // Side effects
export function validateNoCycles(...): boolean        // Boolean
```

Files affected:
- `lib/lint/validators/content-validator.ts`
- `lib/lint/validators/link-validator.ts`
- `lib/lint/validators/filename-validator.ts`
- `lib/lint/validators/idea-validator.ts`
- `lib/lint/validators/directory-validator.ts`
- `lib/lint/validators/principle-hierarchy.ts`
- `lib/validation/index.ts`

## Proposed Pattern

Define a common interface:

```typescript
interface Validator<T> {
  validate(input: T): ValidationResult
}

interface ValidationResult {
  valid: boolean
  violations: Violation[]
}
```

This enables:
- **Composition** — validators can be combined via `ValidatorChain`
- **Consistency** — all validators return the same shape
- **Testability** — uniform interface simplifies test assertions
- **Extensibility** — new validators implement the same contract

## Trade-offs

### Benefits

- Eliminates cognitive overhead of remembering each validator's signature
- Enables building validator pipelines declaratively
- Aligns with [Decoupled Code](../principles/decoupled-code.md) principle
- Makes validation orchestration in `lib/validation/index.ts` cleaner

### Costs

- Requires touching multiple files to refactor existing validators
- Adds an abstraction layer (though minimal)
- Validators that currently throw or return booleans need migration

## Open Questions

### Should validators be synchronous or async?

#### Option: Synchronous by default

Most validators don't need I/O. Keep the interface simple with `validate(): ValidationResult`.

#### Option: Async by default

Use `validate(): Promise<ValidationResult>` to allow validators that need file reads or other async operations without special handling.

### How should validator chains handle early exit?

#### Option: Run all validators, aggregate results

Always run every validator in the chain and combine all violations. Comprehensive but potentially slower.

#### Option: Short-circuit on first failure

Stop at the first validator that returns violations. Faster feedback but may hide multiple issues.
