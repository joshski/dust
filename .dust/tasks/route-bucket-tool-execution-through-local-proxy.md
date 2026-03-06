# Route Bucket Tool Execution Through Local Proxy

Route `dust bucket tool` executions through the local proxy in the active bucket session.

## Principles

- [Agent-Agnostic Design](../principles/agent-agnostic-design.md)
- [Easy Adoption](../principles/easy-adoption.md)
- [Unsurprising UX](../principles/unsurprising-ux.md)
- [Small Units](../principles/small-units.md)

## Blocked By

(none)

## Definition of Done

- [ ] The local proxy exposes `POST /tools/:name` and forwards tool execution requests over the bucket WebSocket protocol, returning execution results as HTTP responses
- [ ] `dust bucket tool <name>` uses the local proxy endpoint when `DUST_PROXY_PORT` is present
- [ ] Tool execution tests cover success, tool-not-found, and proxied error paths end-to-end
- [ ] User-facing guidance explains how `dust bucket tool` discovers and uses the local proxy session
