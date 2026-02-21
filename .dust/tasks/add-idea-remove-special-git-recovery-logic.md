# Add Idea: Remove special “git recovery” logic

Research this idea thoroughly, then create an idea file at `.dust/ideas/remove-special-git-recovery-logic.md`. Read the codebase for relevant context, flesh out the description, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. If you add open questions, use `## Open Questions` with `### Question?` headings and one or more `#### Option` headings beneath each question, and only add questions that are meaningful decisions worth asking. Review `.dust/principles/` and `.dust/facts/` for relevant context.

## Idea Description

We have some code in `dust bucket` and `dust loop` that attempts to recover when the git working copy is in an inconsistent state. Is this a good idea? The only reason this can happen is if an agent “forgets” to check in code. But we’ll start a new context in this case anyway…

## Principles

(none)

## Blocked By

(none)

## Definition of Done

- [ ] Idea file exists at .dust/ideas/remove-special-git-recovery-logic.md
- [ ] Idea file has an H1 title matching "Remove special “git recovery” logic"
- [ ] Idea includes relevant context from codebase exploration
- [ ] Open questions are added for any ambiguous or underspecified aspects
- [ ] Open questions follow the required heading format and focus on high-value decisions
