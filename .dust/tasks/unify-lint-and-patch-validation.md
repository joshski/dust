# Unify Lint and Patch Validation

Consolidate `lintMarkdown()` and `validatePatch()` into a single-pass validation pipeline.

## Context

Currently `lintMarkdown()` in `lib/cli/commands/lint-markdown.ts` and `validatePatch()` in `lib/validation/index.ts` implement similar but divergent validation logic. They run slightly different validator sets and have independent orchestration code.

After validators operate on `ParsedArtifact` types, both entry points can share the same two-phase pipeline:

1. **Phase 1 (Parse)**: Traverse `.dust/`, read files once, parse into `ParsedArtifact` types, build an index
2. **Phase 2 (Validate)**: Run all validators against parsed artifacts (no file I/O)

Directory structure validation runs during Phase 1 — if a directory is invalid, skip parsing its contents.

## Approach

Create a unified validation orchestrator:

```typescript
interface ValidationContext {
  artifacts: Map<string, ParsedArtifact>
  byType: {
    ideas: ParsedArtifact[]
    tasks: ParsedArtifact[]
    principles: ParsedArtifact[]
    facts: ParsedArtifact[]
  }
}

function parseArtifacts(
  fileSystem: ReadableFileSystem,
  dustPath: string
): Promise<{ context: ValidationContext; violations: Violation[] }>

function validateArtifacts(
  context: ValidationContext
): Violation[]
```

- `lintMarkdown()` calls `parseArtifacts()` with the real filesystem
- `validatePatch()` calls `parseArtifacts()` with the overlay filesystem
- Both call `validateArtifacts()` with the resulting context
- Cross-file validators (principle hierarchy, link targets) receive the full context

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Decoupled Code](../principles/decoupled-code.md)
- [Reasonably DRY](../principles/reasonably-dry.md)

## Blocked By

(none)

## Definition of Done

- Single `parseArtifacts()` function handles all file reading and parsing
- Single `validateArtifacts()` function runs all validators
- `lintMarkdown()` and `validatePatch()` share the same validation pipeline
- Directory structure validation happens during the parse phase
- All existing lint and patch validation tests pass
- Performance improvement: each file is read and parsed exactly once
