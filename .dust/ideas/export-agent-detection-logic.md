# Export "agent detection" logic

Downstream users of dust may need to vary behaviour based on the agent type (Claude Code, Claude Code Web, Codex, etc.). Publishing the agent detection module allows them to reuse dust's implementation rather than reimplementing their own environment variable-based detection.

## Background

Dust already has a well-designed, thoroughly tested agent detection module at `lib/agents/detection.ts`. It exports:

- `Agent` — a discriminated union type covering `claude-code-web`, `claude-code`, `codex`, and `unknown`
- `AgentType` — a derived literal type (`Agent['type']`)
- `detectAgent(env?)` — a pure function that inspects environment variables to determine which agent is running

Detection priority:
1. `CLAUDECODE` + `CLAUDE_CODE_REMOTE` → `claude-code-web`
2. `CLAUDECODE` alone → `claude-code`
3. `CODEX_HOME` → `codex`
4. Fallback → `unknown`

The function accepts an optional `env` parameter for testability (dependency injection), making it easy to test without side effects.

This module is currently used internally by the dust CLI (in `pre-push` and `agent-shared` commands) but is not exported via `package.json`.

## What Would Change

A new export entry would be added to `package.json`:

```json
"./agents": {
  "import": "./dist/agents.js",
  "types": "./dist/agents/detection.d.ts"
}
```

The build script in `package.json` would include a step to compile `lib/agents/detection.ts` into `dist/agents.js`. TypeScript declaration files would be generated via `tsconfig.build.json`.

Downstream users could then do:

```ts
import { detectAgent, type Agent, type AgentType } from '@joshski/dust/agents'
```

## Relevant Goals

- **Agent-Specific Enhancement** — Dust detects and enhances the experience for specific agents. Exporting this logic enables downstream tools to do the same.
- **Easy Adoption** — Reduces friction for users who want to build agent-aware tools on top of dust.
- **Minimal Dependencies** — The detection module has zero runtime dependencies; exporting it adds no weight.
- **Decoupled Code** — The module is already isolated; exporting is low-risk.

## Open Questions

### Should the export path be `./agents` or something more specific like `./agents/detection`?

#### `./agents`
A shorter, cleaner path. Implies the module is the canonical agents API. Gives flexibility to expand in the future without changing the import path.

#### `./agents/detection`
More explicit about what's being imported. Matches the file layout. May feel verbose for a small module, but is consistent with how some packages expose submodules.

### Should `name` be part of the public `Agent` type?

The `Agent` type currently includes a human-readable `name` field (e.g., `'Claude Code Web'`). This is useful for display purposes but couples the public API to display strings that might change.

#### Keep `name` in the type
More useful out of the box — consumers can display agent names without their own lookup table.

#### Expose only `type` (as `AgentType`)
Leaner API. Display strings are a UI concern; consumers can define their own labels. Reduces the chance of a display string change being a breaking API change.

#### Keep both, but document `name` as unstable
Mark `name` as informational and not part of the semantic version guarantee.

### Should the `unknown` agent type be exported, or should `detectAgent` return `null` when no agent is detected?

#### Keep `{ type: 'unknown', name: 'Agent' }` as the fallback
Consistent with the current internal API. Consumers always get an `Agent` object and can switch on `type`.

#### Return `Agent | null` (null when no agent detected)
Makes it more idiomatic to check "is an agent running?" — a null check is clearer than `agent.type === 'unknown'`. However, it changes the existing contract.

#### Export both patterns — `detectAgent()` returns `Agent`, `detectKnownAgent()` returns `KnownAgent | null`
Provides both ergonomics without breaking anything. Adds surface area.

### Should this be a separate package or a subpath export from `@joshski/dust`?

#### Subpath export from `@joshski/dust`
Least friction — no new package to publish, version, or document. Keeps dust's surface area coherent.

#### Separate `@joshski/dust-agents` package
Allows the detection logic to be consumed without pulling in `@joshski/dust` at all. Useful if the consumer doesn't use dust's workflow features. Adds publishing and versioning overhead.
