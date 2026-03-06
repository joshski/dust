# Add Local Bucket Proxy for Command Events

Add a local HTTP proxy to `dust bucket` for command events across descendant processes.

## Principles

- [Agent-Agnostic Design](../principles/agent-agnostic-design.md)
- [Cross-Platform Compatibility](../principles/cross-platform-compatibility.md)
- [Small Units](../principles/small-units.md)
- [Task-First Workflow](../principles/task-first-workflow.md)

## Blocked By

(none)

## Definition of Done

- [ ] `dust bucket` starts a local HTTP server on an ephemeral port and exports that port to child process environments (for example via `DUST_PROXY_PORT`)
- [ ] The proxy exposes `POST /events` and forwards accepted event payloads to the existing bucket WebSocket channel
- [ ] Dust command event emission supports the new proxy transport when `DUST_PROXY_PORT` is set, with tests covering nested subprocess compatibility
- [ ] Documentation and tests describe event forwarding behavior and expected error handling for unreachable proxy endpoints
