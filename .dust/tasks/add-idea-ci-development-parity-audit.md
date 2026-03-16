# Add Idea: CI / Development Parity Audit

Research this idea thoroughly, then create one or more idea files in `.dust/ideas/`. Read the codebase for relevant context, flesh out the description, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. If you add open questions, use `## Open Questions` with `### Question?` headings and one or more `#### Option` headings beneath each question, and only add questions that are meaningful decisions worth asking. Run `dust principles` and `dust facts` for relevant context.

## Idea Description

Add an audit for agents to create ideas where the set of tests (and other checks) run by developers is different from those run in CI, e.g. GitHub actions.
Suggest running `dust check` or `dust check —serial` (in slow/resource constrained environments) as part of the CI builds.

## Blocked By

(none)


## Definition of Done

- [ ] One or more idea files are created in `.dust/ideas/`
- [ ] Each idea file has an H1 title matching its content
- [ ] Idea includes relevant context from codebase exploration
- [ ] Open questions are added for any ambiguous or underspecified aspects
- [ ] Open questions follow the required heading format and focus on high-value decisions
