# Add Idea: Fix dust asset upload

Research this idea thoroughly, then create an idea file at `.dust/ideas/fix-dust-asset-upload.md`. Read the codebase for relevant context, flesh out the description, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. If you add open questions, use `## Open Questions` with `### Question?` headings and one or more `#### Option` headings beneath each question, and only add questions that are meaningful decisions worth asking. Review `.dust/principles/` and `.dust/facts/` for relevant context.

## Idea Description

When I run `dust bucket` and that triggers a bash tool that runs `dust asset upload` I get this error:

Exit code 1
Error: DUST_REPOSITORY_ID environment variable is not set.
This command must be run within a repository context (via `dust bucket`).

Investigate!

## Principles

(none)

## Blocked By

(none)

## Definition of Done

- [ ] Idea file exists at .dust/ideas/fix-dust-asset-upload.md
- [ ] Idea file has an H1 title matching "Fix dust asset upload"
- [ ] Idea includes relevant context from codebase exploration
- [ ] Open questions are added for any ambiguous or underspecified aspects
- [ ] Open questions follow the required heading format and focus on high-value decisions
