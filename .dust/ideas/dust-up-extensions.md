# dust up extensions

Extensions to the basic `dust up` command beyond spawning claude loops.

## Dev servers

Allow each repo to specify a dev server command that `dust up` starts alongside the claude loop:

```bash
dust up --dev "bun dev" https://github.com/joshski/dustbucket.git
```

Or inferred from the repo's package.json `dev` script. Dev servers typically already watch for file changes and hot-reload, so `dust up` just needs to spawn them and restart on crash.

This would let a developer run one command and have both the AI working on tasks and the running application visible for manual review.

## Central orchestration via dustbucket

Instead of `dust up` managing everything from the CLI, dustbucket could act as the orchestrator:

- A web UI for adding/removing repos and starting/stopping loops
- Dustbucket spawns and manages the processes, with `dust up` as one possible trigger
- Richer visibility: live logs, task progress, iteration history across all repos
- Could coordinate cross-repo work (e.g. a frontend repo waiting on an API change in a backend repo)

This would evolve dustbucket from a passive dashboard into an active control plane.

## Config file

For repeated use, a config file could replace long CLI argument lists:

```json
{
  "repos": [
    {
      "url": "https://github.com/joshski/dust.git",
      "dev": "bun dev"
    },
    {
      "url": "https://github.com/joshski/dustbucket.git",
      "dev": "bun dev"
    }
  ]
}
```

## Other potential extensions

- **Local repo paths**: Support local paths in addition to git URLs for repos already cloned
- **Selective loops**: Run dev servers for some repos but only claude loops for others
- **Resource limits**: Cap concurrent claude sessions to manage API costs
- **Branch management**: Automatically create feature branches per session to avoid conflicts with manual work
