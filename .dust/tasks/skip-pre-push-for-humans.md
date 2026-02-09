# Skip pre-push hook for humans

Make the `dust pre push` command exit 0 immediately when no agent is detected, so the pre-push hook is a no-op for human pushes.

Currently `prePush` in `lib/cli/commands/pre-push.ts` runs `dust check` (lint + configured checks) for every push regardless of who is pushing. This slows down human workflows unnecessarily — humans have their own development practices and CI catches issues on the remote.

Add an early return at the top of the `prePush` function, after calling `detectAgent(env)`. If `agent.type` is `'unknown'` (meaning no known agent env vars like `CLAUDECODE` or `CODEX_HOME` are set), return `{ exitCode: 0 }` immediately.

The `detectAgent` function in `lib/agents/detection.ts` already returns `{ type: 'unknown' }` when no agent env vars are present, so no changes are needed there.

## Goals

- fast-feedback
- human-ai-collaboration

## Blocked By

(none)

## Definition of Done

- [ ] `prePush` returns `{ exitCode: 0 }` early when `detectAgent(env).type` is `'unknown'`
- [ ] Existing agent-specific checks (task-only detection, uncommitted files, `dust check`) still run for all known agent types
- [ ] Tests in `lib/cli/commands/pre-push.test.ts` updated to cover the human/no-agent early exit
- [ ] Existing pre-push tests still pass
