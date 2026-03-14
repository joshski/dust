# Harden Claude event and tool input typing

Claude stream events enter the system as untyped JSON and stay loosely typed through parsing, formatting, and forwarding. Tightening this boundary would improve compile-time safety in core agent event paths while preserving resilience to upstream protocol drift.

## Current State

### Raw Claude events are broad records

[`lib/claude/types.ts`](../../lib/claude/types.ts) defines `RawEvent` as `Record<string, unknown>` and `ToolUseEvent.input` as `Record<string, unknown>`. This is the root type for Claude streaming data.

### Event parsing relies on inline shape assertions

[`lib/claude/event-parser.ts`](../../lib/claude/event-parser.ts) repeatedly casts `raw` to inline object shapes before reading nested fields. The parser does runtime checks (for example `block.type === 'tool_use'` and `block.id`) but many property reads still happen through asserted shapes rather than reusable typed guards.

### Tool formatters cast individual fields

[`lib/claude/tool-formatters.ts`](../../lib/claude/tool-formatters.ts) accepts `Record<string, unknown>` for every tool formatter (`Write`, `Edit`, `Read`, `Bash`, `TodoWrite`, `Grep`, `Glob`, `Task`) and casts expected fields (`as string | undefined`, `as number | undefined`, etc.). This catches unknown keys at runtime but gives little compile-time protection against misspelled known keys.

### Agent event forwarding remains loosely typed

[`lib/agent-events.ts`](../../lib/agent-events.ts) represents forwarded raw payloads as `Record<string, unknown>` and exposes `rawEventToAgentEvent(...)` / `createHeartbeatThrottler(...)` with this shape. This keeps the transport flexible, but typed narrowing cannot be reused across parser and forwarding layers.

## Findings

### This is a high-leverage boundary

The Claude parser/formatter path is central to `dust loop` and bucket streaming output. Type improvements here reduce risk in multiple commands without changing user-facing workflows.

### Runtime checks already exist, but are scattered

The code already does defensive runtime checking in multiple places. Consolidating those checks into named guards or decoders would improve readability and reduce repeated assertion logic.

### Minimal-dependency pressure is real

A schema library would speed implementation, but this codebase has a strong `Minimal Dependencies` principle. Manual guards may fit project constraints better unless broader validation needs emerge.

## Open Questions

### Where should runtime validation happen for Claude events?

#### Validate once at parse boundary

Add focused decoders/guards in `event-parser.ts` (or a helper module) so downstream code receives narrowed types. This centralizes validation and keeps the rest of the code simpler.

#### Keep parsing permissive and validate per consumer

Maintain broad parser output and let each consumer (`tool-formatters`, event forwarding) defend itself. This avoids a strict central contract but duplicates checks.

### Should tool input typing be strict per known tool names?

#### Introduce typed inputs for known tools with fallback

Define typed input shapes for `Write`, `Edit`, `Read`, `Bash`, `TodoWrite`, `Grep`, `Glob`, and `Task`, while keeping fallback behavior for unknown tools. This adds safety without losing forward compatibility.

#### Keep generic input records and strengthen helper accessors only

Do not introduce per-tool interfaces; instead add reusable typed access helpers (`readStringArg`, `readNumberArg`, etc.) to reduce manual casts while preserving loose shapes.

### Should agent event payload typing stay provider-agnostic?

#### Keep `rawEvent` as generic record in wire protocol

Treat the event protocol as transport-only and avoid Claude-specific typing in `AgentSessionEvent`. This protects `Agent-Agnostic Design` and keeps provider integration simple.

#### Add provider-specific typed payload variants

Model provider-specific payload unions under `agent-event` for better static guarantees in downstream consumers that inspect event payloads.
