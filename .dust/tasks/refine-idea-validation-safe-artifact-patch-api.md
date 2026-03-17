# Refine Idea: Validation-safe artifact patch API

Thoroughly research this idea and refine it into a well-defined proposal. Read the idea file, explore the codebase for relevant context, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. Run `dust principles` for alignment and `dust facts` for relevant design decisions. See [Validation-safe artifact patch API](../ideas/validation-safe-artifact-patch-api.md). If you add open questions, use `## Open Questions` with `### Question?` headings and one or more `#### Option` headings beneath each question, and only add questions that are meaningful decisions worth asking.

I'm not sure we need to model the changes explicitly - we just need to allow the caller to express the new or updated version of each artifact (as objects, not markdown) - internally, references between those artifacts (and other artifacts already on the file system) will be validated. But we don't need a model where we build up a list of "changes".

## Resolved Questions

### Should the API support partial updates or require full object replacement?

**Decision:** Full object replacement

### Should rename operations be first-class?

**Decision:** Compose from delete + create

### How should principle hierarchy changes be expressed?

**Decision:** Tree manipulation operations


## Refines Idea

- [Validation-safe artifact patch API](../ideas/validation-safe-artifact-patch-api.md)

## Blocked By

(none)

## Repository Hints

Consider splitting one idea up into many!


## Definition of Done

- Idea is thoroughly researched with relevant codebase context
- Open questions are added for any ambiguous or underspecified aspects
- Open questions follow the required heading format and focus on high-value decisions
- Idea file is updated with findings
