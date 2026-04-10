# Refine Idea: Run docker-mode pre-flight inside the container

Thoroughly research this idea and refine it into a well-defined proposal. Read the idea file, explore the codebase for relevant context, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. Run `dust principles` for alignment and `dust facts` for relevant design decisions. See [Run docker-mode pre-flight inside the container](../ideas/run-docker-mode-pre-flight-inside-the-container.md). If you add open questions, use `## Open Questions` with `### Question?` headings and one or more `#### Option` headings beneath each question, and only add questions that are meaningful decisions worth asking.

## Resolved Questions

### How does `runOneIteration` access the `ContainerRuntime` to build the container shell runner?

**Decision:** Add `containerRuntime?: ContainerRuntime` to `IterationOptions`


## Refines Idea

- [Run docker-mode pre-flight inside the container](../ideas/run-docker-mode-pre-flight-inside-the-container.md)


## Task Type

refine

## Blocked By

(none)

## Repository Hints

Consider splitting one idea up into many!


## Definition of Done

- Idea is thoroughly researched with relevant codebase context
- Open questions are added for any ambiguous or underspecified aspects
- Open questions follow the required heading format and focus on high-value decisions
- Idea file is updated with findings
