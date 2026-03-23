# Expedite Idea: Container documentation

Research this idea briefly. If confident the implementation is straightforward (clear scope, minimal risk, no open questions), implement directly and commit. Otherwise, create one or more narrowly-scoped task files in `.dust/tasks/`. Run `dust principles` and `dust facts` for relevant context.

## Idea Description

Add a fact which documents how end users can launch `dust bucket worker` with the `--docker` and `--apple-container` flags. If they want to use claude they will need to run `claude setup-token` and set `CLAUDE_CODE_OAUTH_TOKEN`.

Finish with a section about how to provide a custom Dockerfile.

## Blocked By

(none)


## Definition of Done

- Idea is implemented directly OR one or more new tasks are created in `.dust/tasks/`
- If tasks were created, they link to relevant principles from `.dust/principles/`
- Changes are committed with a clear commit message
