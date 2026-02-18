# Add `./agents` subpath export to `@joshski/dust`

Export `lib/agents/detection.ts` as a public subpath export from `@joshski/dust`. Downstream users will be able to import `detectAgent`, `Agent`, and `AgentType` from `@joshski/dust/agents`.

## What to do

1. Add a build step in `package.json` `scripts.build` to compile `lib/agents/detection.ts` into `dist/agents.js`
2. Add a `./agents` entry to the `exports` map in `package.json`:
   ```json
   "./agents": {
     "import": "./dist/agents.js",
     "types": "./dist/agents/detection.d.ts"
   }
   ```
3. Verify `dist/agents/detection.d.ts` is produced by `tsconfig.build.json` (it likely already is, since tsc generates `.d.ts` for all source files under `lib/`)
4. Run `bin/dust check` to confirm all checks pass

Downstream usage after this change:
```ts
import { detectAgent, type Agent, type AgentType } from '@joshski/dust/agents'
```

## Goals

- [Agent-Specific Enhancement](../goals/agent-specific-enhancement.md)
- [Easy Adoption](../goals/easy-adoption.md)
- [Minimal Dependencies](../goals/minimal-dependencies.md)
- [Decoupled Code](../goals/decoupled-code.md)

## Blocked By

(none)

## Definition of Done

- [ ] `dist/agents.js` is produced by the build
- [ ] `dist/agents/detection.d.ts` (or equivalent) is produced by `tsconfig.build.json`
- [ ] `package.json` exports `./agents` with `import` and `types` fields
- [ ] `bin/dust check` passes
