# Add ParsedArtifact with Line Numbers

Introduce a `ParsedArtifact` base type with positional metadata and enrich the existing artifact parsers to track line numbers.

## Context

Both `lintMarkdown()` and `validatePatch()` run validators that re-parse the same markdown content multiple times. The artifact parsers in `lib/artifacts/` already produce structured representations but drop positional information that validators need for error reporting.

This task creates the foundation for single-pass validation by enriching parsers to track:

- Line numbers for the title
- Line numbers for the opening sentence
- Line numbers for section headings
- Line numbers for markdown links
- Section boundaries (start/end lines)

## Approach

Add a `ParsedArtifact` interface that captures positional metadata:

```typescript
interface ParsedMarkdownLink {
  text: string
  target: string
  line: number
}

interface ParsedSection {
  heading: string
  level: number
  startLine: number
  endLine: number
  links: ParsedMarkdownLink[]
}

interface ParsedArtifact {
  filePath: string
  title: string | null
  titleLine: number | null
  openingSentence: string | null
  openingSentenceLine: number | null
  sections: ParsedSection[]
  allLinks: ParsedMarkdownLink[]
}
```

Enrich the existing parsers (`parseIdea`, `parseTask`, `parsePrinciple`, `parseFact`) to optionally return this metadata. Keep the existing artifact types (`Idea`, `Task`, `Principle`, `Fact`) lean for consumers that don't need positions.

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Decoupled Code](../principles/decoupled-code.md)
- [Design for Testability](../principles/design-for-testability.md)

## Blocked By

(none)

## Definition of Done

- `ParsedArtifact` type exists with positional metadata fields
- At least one artifact parser (e.g., `parseIdea`) can produce a `ParsedArtifact`
- Unit tests verify line numbers are correctly tracked for title, opening sentence, sections, and links
- Existing artifact consumers continue to work unchanged
