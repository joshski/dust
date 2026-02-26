# Enrich agent-session-started events

Agent sessions start for different reasons, but `agent-session-started` events don't fully capture them. The `purpose` field only distinguishes `'task'` and `'git-conflict'`, and there's no reference to the artifact (task file, idea file, audit) the session relates to.

For example, a session might be started to work on a task, resolve a git conflict, run an audit, refine an idea, or fix a failing check. Each of these has a natural artifact (a task file path, an idea file path, an audit name) that could be included in the event so that downstream consumers (dashboards, bucket UI, analytics) can link sessions to the artifacts they operated on.

## Open Questions

### What shape should the artifact reference take?

#### A single `artifact` field with type and path

Add `artifact?: { type: string; path: string }` to the event. The type would be something like `'task'`, `'idea'`, `'audit'`, and path would be the file path relative to the repository root.

#### Flatten into the event as `artifactType` and `artifactPath`

Add `artifactType?: string` and `artifactPath?: string` as top-level fields on the event. Simpler to consume but less structured.

### Should `purpose` become a richer enum or stay free-form?

#### Richer enum

Define a fixed set of purposes (e.g., `'task'`, `'git-conflict'`, `'audit'`, `'refine-idea'`, `'decompose-idea'`, `'check-fix'`) so consumers can switch on them reliably.

#### Stay free-form

Keep purpose as a free-form string. This is more flexible and avoids needing to update a central enum when new session reasons are added.
