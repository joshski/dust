# Refine Idea: Multiple loops per repo

Thoroughly research this idea and refine it into a well-defined proposal. Read the idea file, explore the codebase for relevant context, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. Run `dust principles` for alignment and `dust facts` for relevant design decisions. See [Multiple loops per repo](../ideas/multiple-loops-per-repo.md). If you add open questions, use `## Open Questions` with `### Question?` headings and one or more `#### Option` headings beneath each question, and only add questions that are meaningful decisions worth asking.

## Resolved Questions

### Which task types should spawn parallel sessions?

**Decision:** Only idea workflow tasks (Add/Refine/Decompose/Shelve)

### How many parallel loops should be allowed?

**Decision:** Fixed limit (e.g., 2 loops)

### How should task claiming work?

**Decision:** Server-side task assignment

### Should loops share git operations?

**Decision:** Pull-before-push with retry

### How should the TUI display multiple loops?

**Decision:** Expand repository row to show per-loop status


## Refines Idea

- [Multiple loops per repo](../ideas/multiple-loops-per-repo.md)

## Blocked By

(none)

## Repository Hints

Consider splitting one idea up into many!


## Definition of Done

- Idea is thoroughly researched with relevant codebase context
- Open questions are added for any ambiguous or underspecified aspects
- Open questions follow the required heading format and focus on high-value decisions
- Idea file is updated with findings
