# Progress Broadcasting

Stream dust events over websockets to a central server, giving humans real-time visibility into agent work without polling.

## Use cases

- Team dashboards showing all active agent work across repositories
- Slack/Discord notifications when tasks complete or fail
- Mobile alerts for important events (check failures, stuck agents)
- Analytics ingestion for velocity tracking

## Design

### Event types

- `task.started` - Agent began working on a task
- `task.completed` - Task finished successfully
- `check.passed` / `check.failed` - Quality gate results
- `commit.created` - Agent made a commit
- `loop.iteration` - Loop command completed an iteration
- `loop.idle` - No tasks available, agent sleeping

### Architecture

```
┌─────────────┐     websocket      ┌─────────────────┐
│  dust CLI   │ ─────────────────► │  Event Server   │
│  (agent)    │                    │  (self-hosted   │
└─────────────┘                    │   or managed)   │
                                   └────────┬────────┘
                                            │
                          ┌─────────────────┼─────────────────┐
                          ▼                 ▼                 ▼
                    ┌──────────┐      ┌───────────┐      ┌──────────┐
                    │  Slack   │      │ Dashboard │      │ Webhook  │
                    └──────────┘      └───────────┘      └──────────┘
```

## Relationship to Claim Server

This is complementary to the Claim Server idea. The claim server handles coordination (mutex), while broadcasting handles visibility (notifications). They could share infrastructure but serve different purposes.

## Privacy considerations

- Events should not include code content by default
- Repository name and task titles may be sensitive
- Token-based auth required for managed servers
