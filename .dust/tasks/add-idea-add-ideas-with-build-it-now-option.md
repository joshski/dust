# Add Idea: Add ideas with "Build it now" option

Research this idea thoroughly, then create an idea file at `.dust/ideas/add-ideas-with-build-it-now-option.md`. Read the codebase for relevant context, flesh out the description, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. Review `.dust/goals/` and `.dust/facts/` for relevant context.

## Idea Description

When adding an idea, users can opt to "Build it now". This is a hint to the agent to bypass the creation of the idea and go straight to tasks. When this option is passed (in `createCaptureIdeaTask`) then the agent should be instructed not to create an idea, but to create one or more tasks.

## Goals

(none)

## Blocked By

(none)

## Definition of Done

- [ ] Idea file exists at .dust/ideas/add-ideas-with-build-it-now-option.md
- [ ] Idea file has an H1 title matching "Add ideas with "Build it now" option"
- [ ] Idea includes relevant context from codebase exploration
- [ ] Open questions are added for any ambiguous or underspecified aspects
