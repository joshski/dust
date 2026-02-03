# Block push with uncommitted changes in unattended mode

When agents run unattended (e.g., via `dust loop claude`), they can accidentally push broken builds by forgetting to commit files. Local checks pass because the file exists locally, but the remote build fails because the file was never committed.

Add a pre-push check that blocks pushes when there are uncommitted changes and `DUST_UNATTENDED=1` is set. This prevents agents from pushing incomplete work while not affecting human workflows.

## Implementation

1. **Add `env` option to `SpawnOptions`** in `lib/claude/types.ts`:
   ```typescript
   env?: Record<string, string>
   ```

2. **Pass env through in `spawn-claude-code.ts`** (line 58-61):
   ```typescript
   const proc = dependencies.spawn('claude', claudeArguments, {
     cwd,
     stdio: ['ignore', 'pipe', 'pipe'],
     env: { ...process.env, ...options.env },
   })
   ```

3. **Set `DUST_UNATTENDED=1` in `loop.ts`** when calling `run()` (lines 115 and 148):
   ```typescript
   await run(prompt, { cwd: context.cwd, dangerouslySkipPermissions: true, env: { DUST_UNATTENDED: '1' } })
   ```

4. **Add uncommitted changes check in `pre-push.ts`** before calling `check()`:
   - If `env.DUST_UNATTENDED` is set
   - And `git status --porcelain` returns any output
   - Fail with an actionable error message listing the uncommitted files

## Goals

- [Agent Autonomy](../goals/agent-autonomy.md)
- [Repository Hygiene](../goals/repository-hygiene.md)
- [Actionable Errors](../goals/actionable-errors.md)

## Blocked by

(none)

## Definition of done

- [ ] `SpawnOptions` includes optional `env` field
- [ ] `spawn-claude-code.ts` merges `options.env` into spawned process environment
- [ ] `loop.ts` sets `DUST_UNATTENDED=1` when spawning Claude
- [ ] `pre-push.ts` blocks push when `DUST_UNATTENDED=1` and uncommitted changes exist
- [ ] Error message lists the uncommitted/untracked files
- [ ] Unit tests cover the new pre-push behavior
- [ ] Existing tests continue to pass
