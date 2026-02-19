# Refine Idea: Export parsers for all artifacts

Thoroughly research this idea and refine it into a well-defined proposal. Read the idea file, explore the codebase for relevant context, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. Review `.dust/principles/` for alignment and `.dust/facts/` for relevant design decisions. See [Export parsers for all artifacts](../ideas/export-parsers-for-all-artifacts.md). If you add open questions, use `## Open Questions` with `### Question?` headings and one or more `#### Option` headings beneath each question, and only add questions that are meaningful decisions worth asking.

I want to expose everything from 'ideas' and 'workflow-tasks' as a new 'artifacts' module instead (so @joshski/dust/artifacts). It should provide a function called `buildArtifactsRepository(fileSystem)` -- which should return an object that can read the different types of artifacts and create workflow tasks using strongly-typed input models (one object argument to each method)

## Principles

(none)

## Blocked By

(none)

## Definition of Done

- [ ] Idea is thoroughly researched with relevant codebase context
- [ ] Open questions are added for any ambiguous or underspecified aspects
- [ ] Open questions follow the required heading format and focus on high-value decisions
- [ ] Idea file is updated with findings
