# Refine Idea: Docker opt-in command line switch

Thoroughly research this idea and refine it into a well-defined proposal. Read the idea file, explore the codebase for relevant context, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. Run `dust principles` for alignment and `dust facts` for relevant design decisions. See [Docker opt-in command line switch](../ideas/docker-opt-in-command-line-switch.md). If you add open questions, use `## Open Questions` with `### Question?` headings and one or more `#### Option` headings beneath each question, and only add questions that are meaningful decisions worth asking.

It looks like the Dockerfile could just be a file in the dust package, rather than written to a temp path?

## Resolved Questions

### How should `--docker` interact with existing `.dust/config/container/Dockerfile`?

**Decision:** Custom Dockerfile takes precedence (recommended)

### Should generated Dockerfiles be persisted or ephemeral?

**Decision:** Ephemeral (temp file, recommended)


## Refines Idea

- [Docker opt-in command line switch](../ideas/docker-opt-in-command-line-switch.md)

## Blocked By

(none)

## Repository Hints

Consider splitting one idea up into many!


## Definition of Done

- Idea is thoroughly researched with relevant codebase context
- Open questions are added for any ambiguous or underspecified aspects
- Open questions follow the required heading format and focus on high-value decisions
- Idea file is updated with findings
