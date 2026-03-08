# Expedite Idea: Improve task hints

Research this idea briefly. If confident the implementation is straightforward (clear scope, minimal risk, no open questions), implement directly and commit. Otherwise, create one or more narrowly-scoped task files in `.dust/tasks/`. Run `dust principles` and `dust facts` for relevant context.

## Idea Description

Where we say this:

Write a comprehensive description starting with an imperative opening sentence (e.g., "Add caching to the API layer." not "This task adds caching."). Include technical details and references to relevant files.

...we should explicitly mention that the opening sentence cannot exceed 150 characters.

Also, when agents run `bunx dust tasks` they should see a section at the end which says how to add a new task (prompts the agent to run `bunx dust new task`)

## Blocked By

(none)


## Definition of Done

- [ ] Idea is implemented directly OR one or more new tasks are created in `.dust/tasks/`
- [ ] If tasks were created, they link to relevant principles from `.dust/principles/`
- [ ] Changes are committed with a clear commit message
