# Refine Idea: Expose repository principle hierarchy API

Thoroughly research this idea and refine it into a well-defined proposal. Read the idea file, explore the codebase for relevant context, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. Run `dust principles` for alignment and `dust facts` for relevant design decisions. See [Expose repository principle hierarchy API](../ideas/expose-repository-principle-hierarchy-api.md). If you add open questions, use `## Open Questions` with `### Question?` headings and one or more `#### Option` headings beneath each question, and only add questions that are meaningful decisions worth asking.

We want downstream repositories to see the same data (programmatically) as they see when running `dust principles` in a single call to the API - that is a hierarchical summary of 1) the principles in the repository itself and 2) the dust core principles

## Resolved Questions

### Should this support filtering like `getCorePrincipleHierarchy()` does?

**Decision:** Option: No filtering, keep API minimal

### Should the node structure include full principle content?

**Decision:** Option: Minimal node (slug + title only)

### Where should this be exported from?

**Decision:** Option: Export from `@joshski/dust/artifacts` alongside repository functions

### Should this replace or wrap the CLI's `buildPrincipleHierarchy()`?

**Decision:** Option: Keep CLI implementation separate

### Should sorting be configurable?

**Decision:** Option: Always sort alphabetically (current behavior)


## Refines Idea

- [Expose repository principle hierarchy API](../ideas/expose-repository-principle-hierarchy-api.md)


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
