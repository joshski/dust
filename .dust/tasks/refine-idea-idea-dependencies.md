# Refine Idea: Idea dependencies

Thoroughly research this idea and refine it into a well-defined proposal. Read the idea file, explore the codebase for relevant context, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. Run `dust principles` for alignment and `dust facts` for relevant design decisions. See [Idea dependencies](../ideas/idea-dependencies.md). If you add open questions, use `## Open Questions` with `### Question?` headings and one or more `#### Option` headings beneath each question, and only add questions that are meaningful decisions worth asking.

I want to allow users to perform substantial up-front planning of "big ideas", and then leave agents to undertake the work once it has been sufficiently decomposed into tasks. That does not conflict with the principle that individual artifacts should be "small units". But the only way this is possible at the moment is by creating tasks that are artifically "blocked". By creating dependencies between ideas, we could allow users to plan ambitious work (like a whole prototype of a system) prior to any implementation, in such a way that when the tasks are established, most ambiguity has been resolved, and the agents are able to reliably undertake the work autonomously.

I think this means we only need a "blocked by" kind of relationship between ideas. But I think something like "Requires" might be better terminology...

## Refines Idea

- [Idea dependencies](../ideas/idea-dependencies.md)

## Blocked By

(none)

## Repository Hints

Consider splitting one idea up into many!


## Definition of Done

- [ ] Idea is thoroughly researched with relevant codebase context
- [ ] Open questions are added for any ambiguous or underspecified aspects
- [ ] Open questions follow the required heading format and focus on high-value decisions
- [ ] Idea file is updated with findings
