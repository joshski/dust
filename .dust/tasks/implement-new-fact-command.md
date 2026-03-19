# Implement new fact command

Add `dust new fact` command to provide guidance for creating new fact files, following the established pattern of other `dust new` commands.

## Context

Facts are current state documentation that capture how things work today. They document implementation details, architectural decisions, and system behavior. Unlike principles (which are aspirational) or ideas/tasks (which are future work), facts answer "how does this work today?"

The implementation should follow the pattern established by `new-principle.ts`:
1. Create `lib/cli/commands/new-fact.ts` with a pure function for generating instructions and a command handler
2. Register the command in `lib/cli/main.ts`
3. Add tests in `lib/cli/commands/new-fact.test.ts`

## Guidance Content

The command should explain:
- What facts are (current state documentation, not aspirations or future work)
- The file structure: H1 title, opening sentence (appears in `dust facts` output), optional body sections
- File naming convention: kebab-case in `.dust/facts/`
- Direct agents to run `dust facts` to see examples (keep guidance minimal)

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Unsurprising UX](../principles/unsurprising-ux.md)
- [Unit Test Coverage](../principles/unit-test-coverage.md)
- [Co-located Tests](../principles/co-located-tests.md)

## Blocked By

(none)

## Definition of Done

- `lib/cli/commands/new-fact.ts` created following the `new-principle.ts` pattern
- Command registered in `lib/cli/main.ts` as `'new fact': newFact`
- `lib/cli/commands/new-fact.test.ts` tests both standard and Claude Code Web output
- `bin/dust check` passes
- Running `dust new fact` displays guidance for creating fact files
