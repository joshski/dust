# Add Idea: Back channel structured events

Research this idea thoroughly, then create one or more idea files in `.dust/ideas/`. Read the codebase for relevant context, flesh out the description, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. If you add open questions, use `## Open Questions` with `### Question?` headings and one or more `#### Option` headings beneath each question, and only add questions that are meaningful decisions worth asking. Run `dust principles` and `dust facts` for relevant context.

## Idea Description

When we run `dust loop` or `dust bucket worker` we execute an agent CLI which in turn calls `dust` in any given repository. The output of the `dust` CLI is designed to assist the agent in working on the codebase. But the output is not designed for easy parsing by upstream systems. To make it easy and resilient to change, we need dust commands to do both:
* Output human/agent-friendly text
* Send structured data elsewhere (potentially with much more detail that we don't necessarily want to fill up the agent context window)
So we need a "back channel" for dust to send events to the host process somehow. How could this work?

## Blocked By

(none)

## Definition of Done

- [ ] One or more idea files are created in `.dust/ideas/`
- [ ] Each idea file has an H1 title matching its content
- [ ] Idea includes relevant context from codebase exploration
- [ ] Open questions are added for any ambiguous or underspecified aspects
- [ ] Open questions follow the required heading format and focus on high-value decisions
