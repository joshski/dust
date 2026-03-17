# Single-pass validation

Restructure validation so each .dust file is read and parsed once, then all validators run against the parsed result.

## Current State

Both `lintMarkdown()` and `validatePatch()` run validators sequentially, each re-reading and re-parsing the same file content. A principle file may be read 4+ times during a full lint. Within a single file, `extractOpeningSentence()` is called 3 separate times by different content validators. Links are parsed independently by link validation, semantic link validation, and artifact parsing.

The artifact parsers in `lib/artifacts/` already produce structured representations (`Task`, `Idea`, `Principle`, `Fact`) that contain most of what the validators need — title, opening sentence, links, sections, relationships — but the validators don't use them.

## Proposed Change

Replace the current multi-pass orchestration with a two-phase approach:

### Phase 1: Read and parse

One directory traversal of `.dust/`. For each file:

1. Read the file content once
2. Parse it into its artifact type (`Task`, `Idea`, `Principle`, `Fact`) using the existing parsers
3. Expand the parsed types to include everything validators need that isn't already there (line numbers for links, section heading positions, raw opening sentence text)
4. Build an index of all artifacts by type and slug

### Phase 2: Validate

Run all validators against the parsed artifacts and the index. No file I/O in this phase.

- **Per-file validators** receive the parsed artifact (title, opening sentence, links with line numbers, sections)
- **Cross-file validators** (principle hierarchy, link targets, idea transitions) receive the full index

This means the validators would accept parsed artifact types rather than raw `(filePath, content)` pairs.

## What the artifact parsers would need to gain

The existing parsers extract structured content but drop positional information. Validators need:

- **Line numbers for links** — for violation reporting on broken/invalid links
- **Line numbers for section headings** — for violation reporting on missing/malformed sections
- **Raw opening sentence text** — content validators check length and imperative form
- **All markdown links with positions** — not just links in known sections, but anywhere in the file (for general link validation)
- **Section names and their content boundaries** — so validators can check for required sections without re-scanning

This could be a `ParsedArtifact` base type that each specific type extends:

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
  titleLine: number
  openingSentence: string | null
  openingSentenceLine: number
  sections: ParsedSection[]
  allLinks: ParsedMarkdownLink[]
}
```

The specific artifact types (`Task`, `Idea`, `Principle`) would extend this with their domain-specific parsed data.

## Relationship to existing ideas

This complements [Formalize Validator Pattern](formalize-validator-pattern.md) — that idea unifies validator signatures, this one unifies what they receive. Together they'd produce validators that accept a `ParsedArtifact` and return a `ValidationResult`.

## Open Questions

### Should the artifact parsers themselves gain line-number tracking, or should a separate "lint parser" exist?

#### Enrich existing parsers

Add optional positional metadata to the existing `Task`, `Idea`, `Principle` types. The parsers already walk the content line by line in many cases, so tracking positions is incremental work.

Keeps one parse path. Risk: the artifact types become heavier for consumers that don't need positions.

#### Separate lint-oriented parser

Create a `parseForValidation()` function that returns `ParsedArtifact` with full positional data. The existing artifact parsers stay lean.

Two parse paths to maintain, but clean separation of concerns.

### Should patch validation share the same single-pass orchestrator?

#### Yes, unify both paths

`lintMarkdown()` and `validatePatch()` use the same parse-then-validate pipeline. Patch validation just uses the overlay filesystem for the read phase.

Eliminates the current divergence where full lint and patch validation run slightly different validator sets.

#### No, keep them separate

Patch validation has different scope (only changed files + cross-file checks for affected types). A shared orchestrator might over-validate patches or add unnecessary complexity.

### How should directory-structure validation fit in?

#### Include in Phase 1

Directory structure validation (`validateDirectoryStructure`, `validateContentDirectoryFiles`) runs during the traversal phase — if a directory is invalid, skip parsing its contents.

Natural fit: these validators are about the shape of the directory, not file content.

#### Keep separate as Phase 0

Run directory validation as a prerequisite before the parse phase. If it fails, don't bother parsing. This matches the current lint ordering where structure is checked first.
