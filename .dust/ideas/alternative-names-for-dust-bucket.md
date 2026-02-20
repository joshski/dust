# Alternative names for `dust bucket`

The command `dust bucket` connects to a cloud service (dustbucket.com) to receive tasks for repositories and run agent loops remotely. The current name "bucket" evokes a container for collecting things, but doesn't communicate what the command actually does: relinquishing local control to a cloud orchestrator.

## Current State

The `dust bucket` command:
- Authenticates with dustbucket.com via browser OAuth flow
- Establishes a WebSocket connection to receive repository lists and task signals
- Clones repositories locally and runs agent loops on them
- Reports events back to the cloud service over WebSocket
- Presents a TUI with "✨ dust bucket" branding (see `lib/bucket/terminal-ui.ts:506`)

The name "bucket" appears extensively:
- CLI command: `dust bucket`
- Module directory: `lib/bucket/`
- Environment variables: `DUST_BUCKET_TOKEN`, `DUST_BUCKET_HOST`, `DUST_BUCKET_AGENT_CONNECT_URL`
- Cloud service: dustbucket.com
- Events: `bucket.connected`, `bucket.disconnected`, `bucket.repository_added`, etc.

## Naming Considerations

Per the [Naming Matters](../principles/naming-matters.md) and [Clarity Over Brevity](../principles/clarity-over-brevity.md) principles, the name should clearly convey what the command does without requiring explanation.

Alternative name candidates:

| Name | Pros | Cons |
|------|------|------|
| `dust serve` | Implies providing service to something external | Could be confused with "serving files" |
| `dust worker` | Clearly indicates executing tasks for someone else | Generic, doesn't capture cloud aspect |
| `dust agent` | Already used by `dust agent` (local agent command) | Conflict with existing command |
| `dust remote` | Indicates working with a remote service | Could imply git remotes |
| `dust cloud` | Clear cloud association | Overloaded term |
| `dust daemon` | Unix convention for background service | Implies detached background process |
| `dust zombie` | Evokes "mindlessly following orders from elsewhere" | Negative connotation, confusing metaphor |
| `dust puppet` | Controlled externally | Negative connotation |
| `dust satellite` | Remote, orbiting around central control | Too abstract |
| `dust tributary` | Flows into a larger system | Too abstract, unfamiliar |
| `dust drone` | Autonomous unit controlled remotely | Military/surveillance connotations |

## Open Questions

### What metaphor best captures the relationship between the local agent and the cloud service?

#### Option: Service/worker metaphor ("dust serve" or "dust worker")

The command provides a service to a central coordinator. This is accurate and familiar from distributed systems terminology. "Worker" is especially clear for anyone familiar with job queues or distributed task systems.

#### Option: Geographic/spatial metaphor ("dust satellite" or "dust outpost")

The local machine is a remote location connected to a central hub. This captures the topology but may be too abstract for an everyday CLI command.

#### Option: Keep "bucket" with clearer naming for the service

The name "bucket" is memorable and the issue may be with "dustbucket.com" rather than the command. Renaming the service to something like "dust cloud" or "dust central" could clarify the relationship without changing the CLI command.

### Should the rename include the cloud service name?

#### Option: Rename both command and service together

If `dust bucket` becomes `dust serve`, then "dustbucket.com" might become "dustserve.com" or similar. This maintains consistency but requires coordinated changes.

#### Option: Keep service name, only rename CLI command

The cloud service name "dustbucket" is already established. Renaming only the CLI command reduces scope but creates an asymmetry (e.g., `dust serve` connects to "dustbucket.com").

#### Option: Keep CLI command, rename the cloud service

If the confusion stems from the service name, renaming "dustbucket.com" to something like "dustcloud.com" or "dusthub.com" might be clearer while keeping the `dust bucket` command.

### How significant is the rename effort?

#### Option: Full rename across codebase

Change the command name, module directory name, environment variables, event names, and cloud service. This is extensive but would be consistent.

#### Option: CLI alias with deprecation

Add a new command name as the primary, keep `dust bucket` as an alias, and eventually deprecate. This allows gradual migration.

#### Option: Only rename the CLI command

Keep internal module names as `lib/bucket/` but change the user-facing command. This minimizes churn while improving the UX.
