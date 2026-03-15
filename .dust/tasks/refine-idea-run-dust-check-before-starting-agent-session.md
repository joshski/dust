# Refine Idea: Run dust check before starting agent session

Thoroughly research this idea and refine it into a well-defined proposal. Read the idea file, explore the codebase for relevant context, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. Run `dust principles` for alignment and `dust facts` for relevant design decisions. See [Run dust check before starting agent session](../ideas/run-dust-check-before-starting-agent-session.md). If you add open questions, use `## Open Questions` with `### Question?` headings and one or more `#### Option` headings beneath each question, and only add questions that are meaningful decisions worth asking.

Check the details are up to date.

## Resolved Questions

### Should checks be run synchronously before task selection, or as a parallel probe?

**Decision:** Run checks synchronously before task selection (recommended)

### Should bucket mode and standalone loop mode behave the same?

**Decision:** Yes, identical behavior (recommended)


## Refines Idea

- [Run dust check before starting agent session](../ideas/run-dust-check-before-starting-agent-session.md)

## Blocked By

(none)

## Repository Hints

Consider splitting one idea up into many!


## Definition of Done

- [ ] Idea is thoroughly researched with relevant codebase context
- [ ] Open questions are added for any ambiguous or underspecified aspects
- [ ] Open questions follow the required heading format and focus on high-value decisions
- [ ] Idea file is updated with findings
