# Refine Idea: Add `dust bucket` command

Thoroughly research this idea and refine it into a well-defined proposal. Read the idea file, explore the codebase for relevant context, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. Review `.dust/goals/` for alignment and `.dust/facts/` for relevant design decisions. See [Add `dust bucket` command](../ideas/add-dust-bucket-command.md).

We want the actual `dust bucket` command to be resilient to changes to dust itself on the machine in question. So it should start a process that spawns a single command (not one per repository URL). That command should spawn a single sub-process which invokes the `dustCommand` as configured in that repo with the arguments `bucket container`. The container process will expect DUST_API_TOKEN to be set, and will then run one dust loop per repository, but without spawning subprocesses for each loop. Crucially, each iteration of the loop should run the current version of dust for the given repository after having pulled it (so that if dust itself is updated, the new version is executed).

## Goals

(none)

## Blocked By

(none)

## Definition of Done

- [ ] Idea is thoroughly researched with relevant codebase context
- [ ] Open questions are added for any ambiguous or underspecified aspects
- [ ] Idea file is updated with findings
