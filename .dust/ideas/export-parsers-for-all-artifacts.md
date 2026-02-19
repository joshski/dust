# Export parsers for all artifacts

Export a unified interface for parsing all dust artifacts (principles, facts, ideas, and tasks) from a `.dust` directory, with full TypeScript types.

Currently, only the `Idea` interface and `parseIdea()` function are exported via `@joshski/dust/ideas`. The other artifact types (principles, facts, tasks) have parsing logic scattered across validators and internal utilities but no exported interfaces or parsers.

## Current State

The codebase has:
- **Ideas**: Full parser (`lib/ideas.ts`) with `Idea` interface and `parseIdea(fileSystem, dustPath, slug)` exported via `./ideas`
- **Tasks**: Partial support via `parseCaptureIdeaTask()` in `lib/workflow-tasks.ts` for workflow tasks only
- **Principles**: Relationship extraction in `lib/lint/validators/principle-hierarchy.ts` but no `Principle` interface
- **Facts**: No parsing interface, only listed in CLI commands

Markdown utilities exist in `lib/markdown/markdown-utilities.ts` for extracting titles and opening sentences, which are reused across validators.

## Proposed Scope

Add exported interfaces and parsers for all four artifact types:
- `Principle` interface with slug, title, openingSentence, content, parentPrinciples, subPrinciples
- `Fact` interface with slug, title, openingSentence, content
- `Task` interface with slug, title, openingSentence, content, principles, blockedBy, definitionOfDone
- Parser functions: `parsePrinciple()`, `parseFact()`, `parseTask()`
- Optional bulk parsers: `parseAllPrinciples()`, `parseAllFacts()`, etc.

Export via package.json similar to existing `./ideas` export pattern.

## Open Questions

### Should parsers validate content or just extract structure?

#### Extract only (lenient)

Return partial/invalid data when content doesn't match expected structure. Simpler implementation, separates concerns. Consumers can validate separately if needed.

#### Validate and throw (strict)

Throw errors when content is malformed (e.g., missing required sections). Matches existing `parseIdea()` behavior which throws for missing titles.

### Should bulk parsers be included?

#### Yes, include parseAll functions

Add `parseAllPrinciples(fileSystem, dustPath)`, etc. Convenient for downstream consumers that need to load entire directories.

#### No, keep parsers minimal

Only provide single-item parsers. Consumers can compose with `readdir` and map. Keeps the API surface small.

### Should there be a unified artifact type?

#### Single discriminated union

Export `Artifact = Principle | Fact | Idea | Task` union type with a `type` discriminator field. Useful for generic artifact handling.

#### Separate types only

Keep artifact types completely separate. Simpler, no shared abstraction overhead.
