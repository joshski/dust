# Refine Idea: Separate Slow and Fast Checks

Thoroughly research this idea and refine it into a well-defined proposal. Read the idea file, explore the codebase for relevant context, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. Run `dust principles` for alignment and `dust facts` for relevant design decisions. See [Separate Slow and Fast Checks](../ideas/separate-slow-and-fast-checks.md). If you add open questions, use `## Open Questions` with `### Question?` headings and one or more `#### Option` headings beneath each question, and only add questions that are meaningful decisions worth asking.

## Resolved Questions

### How should uncategorised checks be treated?

**Decision:** Option A: Uncategorised checks are treated as fast

### What should the `dust check` command name be for fast-only checks?

**Decision:** Option C: Two separate commands: `dust check` (fast) and `dust check all`

### Should the `speed` field support more than two values?

**Decision:** Option A: Binary: `"fast"` | `"slow"`


## Refines Idea

- [Separate Slow and Fast Checks](../ideas/separate-slow-and-fast-checks.md)


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
