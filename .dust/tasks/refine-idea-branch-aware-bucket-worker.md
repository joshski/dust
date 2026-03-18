# Refine Idea: Branch-aware bucket worker

Thoroughly research this idea and refine it into a well-defined proposal. Read the idea file, explore the codebase for relevant context, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. Run `dust principles` for alignment and `dust facts` for relevant design decisions. See [Branch-aware bucket worker](../ideas/branch-aware-bucket-worker.md). If you add open questions, use `## Open Questions` with `### Question?` headings and one or more `#### Option` headings beneath each question, and only add questions that are meaningful decisions worth asking.

## Resolved Questions

### Should the agent prompt mention the target branch?

**Decision:** Yes, include branch context in the prompt

### Should the bucket worker validate the branch exists before starting the loop?

**Decision:** Yes, validate on clone and fail fast

### How should branch changes be handled?

**Decision:** Require repository removal and re-add

### Should feature branches merge back automatically?

**Decision:** No, branch management is out of scope


## Refines Idea

- [Branch-aware bucket worker](../ideas/branch-aware-bucket-worker.md)

## Blocked By

(none)

## Repository Hints

Consider splitting one idea up into many!


## Definition of Done

- Idea is thoroughly researched with relevant codebase context
- Open questions are added for any ambiguous or underspecified aspects
- Open questions follow the required heading format and focus on high-value decisions
- Idea file is updated with findings
