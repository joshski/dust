# Add Idea: Run dust check before starting agent session

Research this idea thoroughly, then create an idea file at `.dust/ideas/run-dust-check-before-starting-agent-session.md`. Read the codebase for relevant context, flesh out the description, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. Review `.dust/goals/` and `.dust/facts/` for relevant context.

## Idea Description

When dust check fails at the start of any loop or bucket iteration, we should “stop the line” and ask the agent to fix it immediately instead of giving them a task to work on. Then the agent doesn’t need to run dust check itself at the start of their work.

## Goals

(none)

## Blocked By

(none)

## Definition of Done

- [ ] Idea file exists at .dust/ideas/run-dust-check-before-starting-agent-session.md
- [ ] Idea file has an H1 title matching "Run dust check before starting agent session"
- [ ] Idea includes relevant context from codebase exploration
- [ ] Open questions are added for any ambiguous or underspecified aspects
