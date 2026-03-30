# Refine Idea: Multiple Agent Machines Per User

Thoroughly research this idea and refine it into a well-defined proposal. Read the idea file, explore the codebase for relevant context, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. Run `dust principles` for alignment and `dust facts` for relevant design decisions. See [Multiple Agent Machines Per User](../ideas/multiple-agent-machines-per-user.md). If you add open questions, use `## Open Questions` with `### Question?` headings and one or more `#### Option` headings beneath each question, and only add questions that are meaningful decisions worth asking.

When `dust bucket worker` starts up, the user should be prompted to choose a name for the machine. It should default to whatever machine name we can detect automatically.

## Resolved Questions

### Should the server distribute work across multiple machines automatically, or require explicit user configuration?

**Decision:** Option: Hybrid with Connection Identity

### How should the close code 4000 behavior change to support multiple simultaneous connections?

**Decision:** Option: Machine Identity Determines Replacement

### Should machines be assigned fixed capabilities at startup, or dynamically probed per repository?

**Decision:** Option: Static Capabilities


## Refines Idea

- [Multiple Agent Machines Per User](../ideas/multiple-agent-machines-per-user.md)


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
