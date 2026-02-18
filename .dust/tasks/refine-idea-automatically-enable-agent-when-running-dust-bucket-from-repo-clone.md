# Refine Idea: Automatically enable agent when running `dust bucket` from repo clone

Thoroughly research this idea and refine it into a well-defined proposal. Read the idea file, explore the codebase for relevant context, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. Review `.dust/goals/` for alignment and `.dust/facts/` for relevant design decisions. See [Automatically enable agent when running `dust bucket` from repo clone](../ideas/automatically-enable-agent-when-running-dust-bucket-from-repo-clone.md).

All this means is: when we establish a websocket connection, we should send some details to the websocket server such as: what is the operating system, what is the git remote configured for the current working directory (if there is one)

## Goals

(none)

## Blocked By

(none)

## Definition of Done

- [ ] Idea is thoroughly researched with relevant codebase context
- [ ] Open questions are added for any ambiguous or underspecified aspects
- [ ] Idea file is updated with findings
