# Expose Bucket Tool Definitions via Local Proxy and Remove Legacy Paths

Expose tool definitions from the local proxy and remove disk/file-descriptor legacy paths once proxy-based events and tool execution are in place.

## Principles

- [Make the Change Easy](../principles/make-the-change-easy.md)
- [Repository Hygiene](../principles/repository-hygiene.md)
- [Small Units](../principles/small-units.md)
- [Traceable Decisions](../principles/traceable-decisions.md)

## Blocked By

- [Route Bucket Tool Execution Through Local Proxy](route-bucket-tool-execution-through-local-proxy.md)

## Definition of Done

- [ ] The local proxy exposes `GET /tools` that returns the current in-memory tool definitions from the active bucket session
- [ ] Call sites that currently depend on `~/.dust/tools.json` use the proxy-backed source instead
- [ ] Legacy `tool-storage` disk persistence and `DUST_EVENTS_FD` event transport paths are removed, with tests updated for the new behavior
- [ ] Facts and protocol documentation are updated to describe proxy-first transport for tools and events
