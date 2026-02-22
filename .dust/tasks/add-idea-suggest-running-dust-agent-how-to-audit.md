# Add Idea: Suggest running `dust agent how to audit`

Research this idea thoroughly, then create one or more idea files in `.dust/ideas/`. Read the codebase for relevant context, flesh out the description, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. If you add open questions, use `## Open Questions` with `### Question?` headings and one or more `#### Option` headings beneath each question, and only add questions that are meaningful decisions worth asking. Review `.dust/principles/` and `.dust/facts/` for relevant context.

## Idea Description

In each audit, add instructions for the agent to run `dust agent how to audit`. We might need to support template injection in audits so that it knows how to run `dust` in the given environment.

Then we would implement a command in dust that guides the agent through the general steps involved in running an audit (especially how to determine when the particular audit was last run, how to consider the results of previous audits, etc)

## Blocked By

(none)

## Definition of Done

- [ ] One or more idea files are created in `.dust/ideas/`
- [ ] Each idea file has an H1 title matching its content
- [ ] Idea includes relevant context from codebase exploration
- [ ] Open questions are added for any ambiguous or underspecified aspects
- [ ] Open questions follow the required heading format and focus on high-value decisions
