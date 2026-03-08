# Send Agent Capabilities Message on WebSocket Connection

When `dust bucket worker` connects over WebSocket, it should send an `agent-capabilities` message immediately.
The message is fire-and-forget and reports locally available agents and their models.

## Principles

- [Agent-Agnostic Design](../principles/agent-agnostic-design.md)
- [Agent-Specific Enhancement](../principles/agent-specific-enhancement.md)
- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Small Units](../principles/small-units.md)

## Relevant Facts

- [Bucket Protocol](../facts/bucket-protocol.md)
- [Workflow Task Transitions](../facts/workflow-task-transitions.md)
- [Task File Format](../facts/task-file-format.md)

## Blocked By

(none)

## Definition of Done

- [ ] The bucket client protocol supports a new client-to-server `agent-capabilities` message shape that includes agent type plus models.
- [ ] On each successful WebSocket connection, the worker sends exactly one `agent-capabilities` message before processing subsequent server traffic, and does not wait for an acknowledgment.
- [ ] Agent availability detection is implemented via minimal command probes (for example, lightweight version checks) rather than environment-variable heuristics alone.
- [ ] Capability discovery is structured with a pure decision core (availability/model selection from probe results) and an imperative shell (process/env/network I/O), with focused tests around both layers.
- [ ] Claude model discovery uses hardcoded aliases, and Codex model discovery follows the chosen live discovery path; failures degrade gracefully without breaking bucket startup.
- [ ] Bucket command tests cover end-to-end handshake behavior, including no-capability and partial-capability scenarios.
- [ ] `.dust/facts/bucket-protocol.md` documents the new client-to-server message and expected timing semantics.
