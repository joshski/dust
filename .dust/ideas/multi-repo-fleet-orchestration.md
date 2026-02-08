# Multi-repo fleet orchestration

Orchestrate dust loops across multiple repositories from a single command, with each iteration running in an isolated container.

## Motivation

Today a user who wants dust running across several projects must clone each repo and manually start a `dust loop` in each one. A fleet command would let a single dust instance manage work across many repos:

- **Single entry point**: One command takes a list of repository URLs and manages loops for all of them
- **Isolation by default**: Each iteration runs in a container (Docker, cloud sandbox, or third-party service), building on the ideas in `dust-loop-docker.md` and `expand-dust-loop-to-support-third-party-sandbox-providers.md`
- **Centralized visibility**: The orchestrator aggregates events from all repos into a unified view

## Possible implementation

The orchestrator would:

1. Accept a list of repository URLs (e.g. `dust fleet repo1-url repo2-url repo3-url`)
2. Clone or pull each repo into a managed workspace
3. For each repo, run dust loop iterations by dispatching work to a container backend
4. Collect events from workers via the existing `eventsUrl` mechanism (orchestrator runs an HTTP server, workers POST events back)
5. Present a unified dashboard showing status across all repos

## Open Questions

### Should the orchestrator itself be a dust loop?

#### Yes, make the orchestrator a meta-loop

The orchestrator checks all repos for available tasks and dispatches work. This reuses the existing loop machinery and keeps the model consistent.

#### No, keep the orchestrator as a long-running supervisor

The orchestrator is a persistent process that manages independent loops per repo. Simpler to reason about, but a different execution model from the worker loops.

### How should workspaces be managed?

#### Persistent workspace per repo with ephemeral agent processes

Clone each repo once, mount the workspace into a fresh container per iteration. Fast iteration startup since the workspace already exists, and the agent process is still isolated.

#### Fully ephemeral containers

Clone fresh each iteration. Maximum isolation but slower startup due to repeated cloning and dependency installation.

### How should cross-repo coordination work?

#### Independent repos with no cross-repo dependencies

Each repo has its own `.dust/` directory and task graph. The orchestrator simply runs them in parallel with no coordination. Simplest model.

#### Central planning repo dispatches to code repos

One repo (the planning repo) contains tasks that reference other repos. The orchestrator reads tasks from the planning repo and dispatches execution to the appropriate code repo container. More powerful but more complex.

### What container backend should be supported first?

#### Docker (local)

Simplest to implement, no external dependencies, good for development and small-scale use.

#### Cloud sandbox provider (Daytona, E2B, etc.)

More useful for real workloads since it offloads compute, but adds external dependencies and authentication complexity.
