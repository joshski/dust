# Add Idea: Pre-push follow up tasks

Research this idea thoroughly, then create one or more idea files in `.dust/ideas/`. Read the codebase for relevant context, flesh out the description, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. If you add open questions, use `## Open Questions` with `### Question?` headings and one or more `#### Option` headings beneath each question, and only add questions that are meaningful decisions worth asking. Run `dust principles` and `dust facts` for relevant context.

## Idea Description

If we pull the `git push` step out of the bucket loop (like we already did with the `git pull` and `dust check` steps) then we can run many agent sessions before pushing -- for example every implementation session can be followed up with a post-implementation review session (thereby reducing the likelihood of unwanted changes being pushed). This would also reduce the scope of an implementation session to "just the implementation". I think we would still want to keep checks in the same implementation session though... do you agree?

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
