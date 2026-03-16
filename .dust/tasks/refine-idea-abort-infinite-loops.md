# Refine Idea: Abort infinite loops

Thoroughly research this idea and refine it into a well-defined proposal. Read the idea file, explore the codebase for relevant context, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. Run `dust principles` for alignment and `dust facts` for relevant design decisions. See [Abort infinite loops](../ideas/abort-infinite-loops.md). If you add open questions, use `## Open Questions` with `### Question?` headings and one or more `#### Option` headings beneath each question, and only add questions that are meaningful decisions worth asking.

## Resolved Questions

### What threshold should trigger the abort?

**Decision:** Fixed iteration count (e.g., 3 consecutive failures)

### What counts as "no progress"?

**Decision:** Can we use events to detect that the agent is repeatedly working on the same task? I think we have new events since this idea was first written up

### Should the abort be different in bucket mode vs standalone loop?

**Decision:** Same behavior in both

### Should there be a `git reset --hard` when aborting?

**Decision:** Yes, reset to clean state


## Refines Idea

- [Abort infinite loops](../ideas/abort-infinite-loops.md)

## Blocked By

(none)

## Repository Hints

Consider splitting one idea up into many!


## Definition of Done

- [ ] Idea is thoroughly researched with relevant codebase context
- [ ] Open questions are added for any ambiguous or underspecified aspects
- [ ] Open questions follow the required heading format and focus on high-value decisions
- [ ] Idea file is updated with findings
