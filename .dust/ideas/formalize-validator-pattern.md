# Formalize Validator Pattern

Introduce a consistent `Validator` interface across all validation code to enable composition, chaining, and uniform error aggregation.

## Current State

Validators in `lib/lint/validators/` have three distinct signature patterns:

```typescript
// Pattern 1: Single violation or null (most common)
export function validateFilename(filePath: string): Violation | null
export function validateOpeningSentence(filePath: string, content: string): Violation | null
export function validateTitleFilenameMatch(filePath: string, content: string): Violation | null

// Pattern 2: Violation array (for validators that can find multiple issues)
export function validateLinks(filePath: string, content: string, fs: ReadableFileSystem): Violation[]
export function validateTaskHeadings(filePath: string, content: string): Violation[]
export function validateIdeaOpenQuestions(filePath: string, content: string): Violation[]
export function validateNoCycles(allRelationships: PrincipleRelationships[]): Violation[]

// Pattern 3: Async validators (need filesystem access)
export async function validateContentDirectoryFiles(dirPath: string, fs: ReadableFileSystem): Promise<Violation[]>
export async function validateDirectoryStructure(dustPath: string, fs: ReadableFileSystem): Promise<Violation[]>
```

Files affected:
- `lib/lint/validators/content-validator.ts` — 4 validators, all sync
- `lib/lint/validators/link-validator.ts` — 3 validators, all sync
- `lib/lint/validators/filename-validator.ts` — 2 validators, all sync
- `lib/lint/validators/idea-validator.ts` — 4 validators, all sync
- `lib/lint/validators/directory-validator.ts` — 2 validators, **async**
- `lib/lint/validators/principle-hierarchy.ts` — 4 validators, all sync

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

Note: `ValidationResult` already exists in `lib/validation/index.ts` with this exact shape.

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
- Converting `Violation | null` returns to `ValidationResult` adds verbosity

## Design Decisions

### Sync vs Async

**Decision:** Synchronous by default.

Only 2 of 19 validators are async (both in `directory-validator.ts`), and only because they need `readdir()`. All other validators work with content already loaded. The async validators can remain async or be wrapped.

### Chain Early Exit

**Decision:** Run all validators, aggregate results.

This aligns with the existing behavior in `validatePatch()` which collects all violations before returning. Users benefit from seeing all issues at once rather than fixing one at a time.

## Open Questions

### Should we use a class-based or function-based interface?

#### Option: Function-based (current pattern)

Keep validators as pure functions. Wrap them in a `createValidator()` helper that normalizes return types:

```typescript
const filenameValidator = createValidator(validateFilename)
// Converts Violation | null to ValidationResult
```

Pros: Minimal change to existing code, aligns with [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md).

#### Option: Class-based interface

Validators implement a `Validator<T>` interface:

```typescript
class FilenameValidator implements Validator<string> {
  validate(filePath: string): ValidationResult { ... }
}
```

Pros: Clear contract, IDE autocompletion for implementations. Cons: More boilerplate, less idiomatic for this codebase.

### What should the generic type `T` represent?

#### Option: Single unified input type

Define a standard input type for all single-file validators:

```typescript
interface ValidatorInput {
  filePath: string
  content: string
  fileSystem?: ReadableFileSystem
}
```

Pros: Uniform signature, easy chaining. Cons: Some validators don't need all fields.

#### Option: Validator-specific input types

Let each validator define its own input type:

```typescript
type FilenameValidatorInput = string  // just filePath
type LinkValidatorInput = { filePath: string; content: string; fs: ReadableFileSystem }
```

Pros: Type-safe, no unused parameters. Cons: Harder to compose generically.

### Should ValidationResult include metadata about which validator produced it?

#### Option: No metadata

Keep `ValidationResult` minimal:

```typescript
interface ValidationResult {
  valid: boolean
  violations: Violation[]
}
```

This is the current shape and sufficient for aggregation.

#### Option: Include validator identity

Add optional source information:

```typescript
interface ValidationResult {
  valid: boolean
  violations: Violation[]
  validatorName?: string
}
```

Useful for debugging which validator produced which violations, but adds complexity.
