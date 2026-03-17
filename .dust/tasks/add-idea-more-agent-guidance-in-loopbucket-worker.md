# Add Idea: More agent guidance in loop/bucket worker

Research this idea thoroughly, then create one or more idea files in `.dust/ideas/`. Read the codebase for relevant context, flesh out the description, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. If you add open questions, use `## Open Questions` with `### Question?` headings and one or more `#### Option` headings beneath each question, and only add questions that are meaningful decisions worth asking. Run `dust principles` and `dust facts` for relevant context.

## Idea Description

We don't really introduce dust conceptually to agents in `dust bucket worker` and `dust loop` modes. We give a very specific, task-oriented prompt. But that means agents don't know to use the dust tools like `dust ideas` etc.

We should include a "mini guide to dust" in task-oriented prompts, if we want to avoid agents doing things like this early in sessions:

`Grep .dust/ideas/*`

## Blocked By

(none)


## Definition of Done

- One or more idea files are created in `.dust/ideas/`
- Each idea file has an H1 title matching its content
- Idea includes relevant context from codebase exploration
- Open questions are added for any ambiguous or underspecified aspects
- Open questions follow the required heading format and focus on high-value decisions
