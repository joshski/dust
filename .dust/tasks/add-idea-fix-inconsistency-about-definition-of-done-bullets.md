# Add Idea: Fix inconsistency about definition of done bullets

Research this idea thoroughly, then create one or more idea files in `.dust/ideas/`. Read the codebase for relevant context, flesh out the description, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. If you add open questions, use `## Open Questions` with `### Question?` headings and one or more `#### Option` headings beneath each question, and only add questions that are meaningful decisions worth asking. Run `dust principles` and `dust facts` for relevant context.

## Idea Description

An agent said this:

---
bunx dust new task printed one instruction that says:

- “Add a ## Definition of Done section with completion criteria using -  for each item”

But dust’s own generated templates and source say:

- use - [ ] checklist items in /Users/josh/.bun/install/global/node_modules/@joshski/dust/dist/artifacts.js (#/Users/
    josh/.bun/install/global/node_modules/@joshski/dust/dist/artifacts.js)
- the workflow text also says “using - [ ] for each item” in /Users/josh/.bun/install/global/node_modules/@joshski/dust/
    dist/dust.js (#/Users/josh/.bun/install/global/node_modules/@joshski/dust/dist/dust.js)

So the inconsistency I meant was simply: one dust instruction says plain bullets, while dust’s templates and other guidance say checkbox bullets. I was going to follow - [ ] because that matches the generated task format.
---

Dust should not suggest using `[ ]` anywhere, since this is redundant noise

## Task Type

capture

## Blocked By

(none)


## Definition of Done

- One or more idea files are created in `.dust/ideas/`
- Each idea file has an H1 title matching its content
- Idea includes relevant context from codebase exploration
- Open questions are added for any ambiguous or underspecified aspects
- Open questions follow the required heading format and focus on high-value decisions
