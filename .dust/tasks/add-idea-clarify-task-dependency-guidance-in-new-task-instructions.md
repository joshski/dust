# Add Idea: Clarify task dependency guidance in new-task instructions

Research this idea thoroughly, then create one or more idea files in `.dust/ideas/`. Read the codebase for relevant context, flesh out the description, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. If you add open questions, use `## Open Questions` with `### Question?` headings and one or more `#### Option` headings beneath each question, and only add questions that are meaningful decisions worth asking. Run `dust principles` and `dust facts` for relevant context.

## Idea Description

Make the task-creation instructions more explicit about when and why to add dependencies between tasks. The current guidance tells agents to fill in the `## Blocked By` section, but it does not clearly say that related tasks should use dependencies to preserve execution order and avoid parallel work on unfinished prerequisites. Update the relevant new-task instructions or templates so agents are directly reminded to link tasks with `blockedBy` whenever one task depends on another or should wait for groundwork to land first.

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
