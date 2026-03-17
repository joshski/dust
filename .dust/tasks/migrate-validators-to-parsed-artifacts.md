# Migrate Validators to Parsed Artifacts

Refactor validators to accept `ParsedArtifact` types instead of raw `(filePath, content)` pairs, eliminating redundant parsing.

## Context

Validators in `lib/lint/validators/` currently receive raw markdown content and re-parse it independently. For example, `extractOpeningSentence()` is called three separate times by different validators on the same file. Link patterns are parsed independently by link validation, semantic link validation, and artifact parsing.

After `ParsedArtifact` with line-number tracking exists, validators can operate on pre-parsed data.

## Approach

Migrate validators to accept `ParsedArtifact` instead of raw content:

**Content validators** (`content-validator.ts`):
- `validateOpeningSentence` → use `artifact.openingSentence` and `artifact.openingSentenceLine`
- `validateOpeningSentenceLength` → use `artifact.openingSentence`
- `validateTitleFilenameMatch` → use `artifact.title`
- `validateImperativeOpeningSentence` → use `artifact.openingSentence`

**Link validators** (`link-validator.ts`):
- `validateLinks` → use `artifact.allLinks` with line numbers
- `validateSemanticLinks` → use `artifact.allLinks`

**Idea validators** (`idea-validator.ts`):
- `validateIdeaOpenQuestions` → use parsed sections structure

**Task validators** (`task-validator.ts`):
- `validateTaskHeadings` → use `artifact.sections`

**Principle validators** (`principle-hierarchy.ts`):
- `validatePrincipleHierarchySections` → use `artifact.sections`
- `validatePrincipleHierarchyLinks` → use `artifact.allLinks`

The validators become pure functions: `(artifact: ParsedArtifact) => Violation[]`

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Decoupled Code](../principles/decoupled-code.md)
- [Unit Test Coverage](../principles/unit-test-coverage.md)

## Blocked By

(none)

## Definition of Done

- All validators accept `ParsedArtifact` instead of raw content
- No validator performs its own markdown parsing (uses pre-parsed data)
- Violation line numbers are preserved (sourced from `ParsedArtifact`)
- All existing validator tests pass with the new signatures
- No functional changes to what violations are reported
