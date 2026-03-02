# Alternative names for dust bucket worker

The command `dust bucket worker` runs on a machine to receive tasks from dustbucket.com and spawn Docker containers to perform the work. The current name "worker" suggests this process does the work, but it actually orchestrates containers that perform the work.

## Current State

The architecture has three layers:

1. **dustbucket.com** — The cloud service that coordinates repositories and tasks
2. **`dust bucket worker`** — A process on your machine that connects to dustbucket.com, clones repositories, and spawns containers
3. **Docker containers** — Sandboxed environments where Claude Code actually executes tasks

The "worker" terminology is confusing because:
- In distributed systems, a "worker" typically performs the work itself
- Here, the "worker" spawns containers that perform the work — those containers are the actual workers
- The `dust bucket worker` process is more like a supervisor, foreman, or orchestrator

The related idea [Alternative names for dust bucket](alternative-names-for-dust-bucket.md) addresses renaming the parent command and cloud service. This idea focuses specifically on the `worker` subcommand.

## Current Usage

The command appears in:
- CLI registration: `lib/cli/main.ts:63` as `'bucket worker': bucketWorker`
- Implementation: `lib/cli/commands/bucket.ts:853` as `bucketWorker()`
- Documentation: `.dust/facts/docker-agent-mode.md:35` mentions "dust bucket worker"
- Other ideas reference "dust bucket worker" (e.g., proxy-servers-for-docker-containers.md)

## Naming Considerations

Per the [Naming Matters](../principles/naming-matters.md) and [Clarity Over Brevity](../principles/clarity-over-brevity.md) principles, the subcommand name should accurately describe what it does: connect to the cloud service and orchestrate local container execution.

Alternative subcommand names:

| Name | Pros | Cons |
|------|------|------|
| `host` | Reflects that it hosts/runs containers | Could be confused with hostname |
| `connect` | Clear about establishing connection | Doesn't convey ongoing operation |
| `run` | Simple, action-oriented | Too generic |
| `start` | Implies starting a service | Doesn't convey cloud connection |
| `serve` | Implies providing service to central system | Could be confused with HTTP serving |
| `agent` | Describes the supervisory role | Already used by `dust agent` |
| `node` | Distributed systems term for participants | Overloaded term (Node.js) |
| `spawn` | Describes container spawning | Misses the cloud connection aspect |
| `orchestrate` | Technically accurate | Too verbose, academic |
| (no subcommand) | Just `dust bucket` does it all | Simpler, but less explicit |

## Open Questions

### Should the subcommand be removed entirely?

#### Option: Keep `dust bucket worker` as a subcommand

Maintains explicit distinction between authentication/setup commands and the actual worker process. Allows for future subcommands like `dust bucket status` or `dust bucket logs`.

#### Option: Make `dust bucket` the worker command directly

Since `dust bucket` currently has no default behavior (you must specify `worker` or `asset upload`), the main command could become the worker. This matches how `dust loop claude` works — `dust loop` doesn't do anything by itself.

However, this may conflict if `dust bucket` is renamed (see alternative-names-for-dust-bucket.md) — e.g., if `dust serve` becomes the command, then `dust serve` alone would be the worker.

### What metaphor best describes the bucket worker's role?

#### Option: Supervisor/foreman metaphor

The process supervises containers that do the actual work. Terms like "supervisor", "foreman", or "overseer" capture this relationship. However, these might sound authoritarian.

#### Option: Host metaphor

The process "hosts" the containers on your machine. This aligns with infrastructure terminology (Docker host, container host). Could use `dust bucket host` or just make `dust bucket` the hosting command.

#### Option: Keep "worker" but reframe the containers

Instead of renaming the bucket worker, rename what the containers are called internally. If containers are "jobs" or "tasks", then "worker" running jobs makes more sense. This requires less visible change but may still confuse distributed systems practitioners.

### Should this rename happen with or separately from the `dust bucket` rename?

#### Option: Rename both together

If `dust bucket` becomes `dust serve`, then the subcommand question resolves naturally — either `dust serve` runs the worker directly, or there's a subcommand like `dust serve start`.

#### Option: Rename `worker` independently

The `worker` terminology problem exists regardless of whether `dust bucket` is renamed. Fixing it now reduces confusion for current users. But it may result in two rename efforts.
