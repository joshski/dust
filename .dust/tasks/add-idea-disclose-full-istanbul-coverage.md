# Add Idea: Disclose full istanbul coverage

Research this idea thoroughly, then create one or more idea files in `.dust/ideas/`. Read the codebase for relevant context, flesh out the description, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. If you add open questions, use `## Open Questions` with `### Question?` headings and one or more `#### Option` headings beneath each question, and only add questions that are meaningful decisions worth asking. Run `dust principles` and `dust facts` for relevant context.

## Idea Description

The istanbul reporter hides a lot of coverage noise. But when an agent actively wants to see it, it can't. Update the reporter to write an exhaustive and machine-readable coverage report to a file, and report the location of that file in the minimal coverage report output (so agents can read it if they wish to). Make the format friendly for searching with unix tools...

## Blocked By

(none)


## Definition of Done

- One or more idea files are created in `.dust/ideas/`
- Each idea file has an H1 title matching its content
- Idea includes relevant context from codebase exploration
- Open questions are added for any ambiguous or underspecified aspects
- Open questions follow the required heading format and focus on high-value decisions
