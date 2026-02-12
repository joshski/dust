# Add Idea: Add `dust bucket` command

Research this idea thoroughly, then create an idea file at `.dust/ideas/add-dust-bucket-command.md`. Read the codebase for relevant context, flesh out the description, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. Review `.dust/goals/` and `.dust/facts/` for relevant context. The idea should have the title "Add `dust bucket` command" and start from the following description:

`dust bucket <token>`

Should open a web socket connection to https://dustbucket.com/agent/connect (with the token in an http auth header)

The remote URL should respond by sending a list of repository URLs. For each URL, a process should be started to run claude in a loop. A terminal interface should allow switching between the different repository URLs, to isolate logs from that repository’s process.

All events sent by the server should have an event element, where “repository-list” is the only emitted event (and has a “repositories” array, with a gitUrl member on each element.

Subsequent events should cause dust to spawn new processes or kill processes for any no-longer-tracked repos.

Each process should run in a temp directory that is deleted when the process is stopped, but otherwise reused between claude invocations (with that directory as cwd)

## Goals

(none)

## Blocked By

(none)

## Definition of Done

- [ ] Idea file exists at .dust/ideas/add-dust-bucket-command.md
- [ ] Idea file has an H1 title matching "Add `dust bucket` command"
- [ ] Idea includes relevant context from codebase exploration
- [ ] Open questions are added for any ambiguous or underspecified aspects
