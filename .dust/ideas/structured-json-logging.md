# Structured JSON Logging

Add structured JSON log output alongside text logs for machine parsing.

## Background

The [Development Traceability](../principles/development-traceability.md) principle calls for "structured logging and tracing" to help agents "understand system behaviour without resorting to ad-hoc testing cycles."

Currently, dust's logging system produces human-readable text:

```
dust.loop starting iteration 5
dust.loop.claude spawning agent for task: implement-feature.md
dust.cli.commands.check lint passed in 234ms
```

This works for humans but agents must parse free-form text to extract structured information. When debugging, an agent cannot programmatically query "which checks took longer than 1 second?" or "how many iterations failed today?"

## Proposed Solution

Add a JSON Lines (JSONL) output mode for logs:

```json
{"ts":"2024-01-15T10:30:00Z","logger":"dust.loop","level":"info","msg":"starting iteration","iteration":5}
{"ts":"2024-01-15T10:30:01Z","logger":"dust.loop.claude","level":"info","msg":"spawning agent","task":"implement-feature.md"}
{"ts":"2024-01-15T10:30:02Z","logger":"dust.cli.commands.check","level":"info","msg":"check passed","check":"lint","duration":234}
```

Enable via environment variable: `DUST_LOG_FORMAT=json`

## Benefits

- **Queryable**: Agents can filter by logger, level, or custom fields
- **Aggregatable**: Compute metrics like average check duration
- **Parseable**: No regex required to extract structured data
- **Compatible**: JSONL is widely supported by log aggregation tools

## Principle Alignment

- [Development Traceability](../principles/development-traceability.md) - Structured logs for systematic debugging
- [Debugging Tooling](../principles/debugging-tooling.md) - Machine-readable diagnostic output
- [Agent Autonomy](../principles/agent-autonomy.md) - Agents can analyze logs without human help

## Open Questions

### Should JSON and text logging be mutually exclusive?

#### Either/or

`DUST_LOG_FORMAT=json` produces only JSON, `DUST_LOG_FORMAT=text` (default) produces only text. Simple configuration.

#### Both simultaneously

Write JSON to a `.log.json` file while text goes to console. More disk usage but enables both workflows.

### What fields should be standardized?

#### Minimal schema

Only require `ts`, `logger`, `level`, `msg`. Everything else is optional context.

#### Structured schema

Define standard fields for common events (check name, duration, exit code). More consistent but more rigid.

### How should this interact with existing DEBUG filtering?

#### Separate controls

`DEBUG` filters which loggers emit, `DUST_LOG_FORMAT` controls output format. Orthogonal concerns.

#### Unified configuration

A single config that specifies both what to log and how. More powerful but more complex.
