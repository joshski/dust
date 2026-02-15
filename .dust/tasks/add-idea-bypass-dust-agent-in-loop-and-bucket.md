# Add Idea: Bypass dust agent in loop and bucket

Research this idea thoroughly, then create an idea file at `.dust/ideas/bypass-dust-agent-in-loop-and-bucket.md`. Read the codebase for relevant context, flesh out the description, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. Review `.dust/goals/` and `.dust/facts/` for relevant context.

## Idea Description

In dust loop and dust bucket commands, the looping function should choose the next task and then tell the agent specifically to work on that task (equivalent to asking the agent to “focus” except the loop command can emit a event immediately and pass a prompt to claude that includes the instructions about how to execute a task, and the body of the task, in the initial message.

## Goals

(none)

## Blocked By

(none)

## Definition of Done

- [ ] Idea file exists at .dust/ideas/bypass-dust-agent-in-loop-and-bucket.md
- [ ] Idea file has an H1 title matching "Bypass dust agent in loop and bucket"
- [ ] Idea includes relevant context from codebase exploration
- [ ] Open questions are added for any ambiguous or underspecified aspects
