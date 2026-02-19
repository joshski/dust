# Add Artifact Parsers

Add parsers for principles, facts, and tasks to the artifacts repository. Each parser extracts structured data from markdown files in `.dust/principles/`, `.dust/facts/`, and `.dust/tasks/`.

## Implementation Notes

- Add `Principle` interface with: `slug`, `title`, `content`, `parentPrinciple` (link), `subPrinciples` (links)
- Add `Fact` interface with: `slug`, `title`, `content`
- Add `Task` interface with: `slug`, `title`, `content`, `principles` (links), `blockedBy` (links), `definitionOfDone` (checklist items)
- Add repository methods:
  - `parsePrinciple(options: { slug: string }): Promise<Principle>`
  - `listPrinciples(): Promise<string[]>`
  - `parseFact(options: { slug: string }): Promise<Fact>`
  - `listFacts(): Promise<string[]>`
  - `parseTask(options: { slug: string }): Promise<Task>`
  - `listTasks(): Promise<string[]>`

## Principles

- [Small Units](../principles/small-units.md) - Each parser is a focused, single-purpose function
- [Decoupled Code](../principles/decoupled-code.md) - Parsers use injected fileSystem

## Blocked By

- [Create Artifacts Repository](create-artifacts-repository.md)

## Definition of Done

- [ ] `Principle`, `Fact`, and `Task` interfaces are defined and exported
- [ ] Repository methods for parsing each artifact type are implemented
- [ ] Repository methods for listing each artifact type are implemented
- [ ] Tests cover parsing of principles, facts, and tasks
