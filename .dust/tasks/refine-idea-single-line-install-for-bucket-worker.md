# Refine Idea: Single-Line Install for Bucket Worker

Thoroughly research this idea and refine it into a well-defined proposal. Read the idea file, explore the codebase for relevant context, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. Run `dust principles` for alignment and `dust facts` for relevant design decisions. See [Single-Line Install for Bucket Worker](../ideas/single-line-install-for-bucket-worker.md). If you add open questions, use `## Open Questions` with `### Question?` headings and one or more `#### Option` headings beneath each question, and only add questions that are meaningful decisions worth asking.

`dust bucket worker` is designed to be run indefinitely. It should automatically self-update without any intervention - even after it has started, not just at startup. When a new version is detected after the worker has started, the worker should not take on any new work per repository.

## Resolved Questions

### How should the installation script be distributed?

**Decision:** Option: Shell Script via HTTP

### What technology should implement the self-update mechanism?

**Decision:** Option: Built-in Auto-Update Check

### Should the worker bundle Node.js runtime or remain runtime-agnostic?

**Decision:** Option: Remain Runtime-Agnostic

### Should Docker be included by default or remain optional?

**Decision:** Option: Keep Docker Optional

### How should authentication be handled during installation?

**Decision:** Option: Interactive OAuth During Install

### Should updates be automatic or user-controlled?

**Decision:** Option: Fully Automatic Updates


## Refines Idea

- [Single-Line Install for Bucket Worker](../ideas/single-line-install-for-bucket-worker.md)


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
