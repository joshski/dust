# Move CLI commands to commands subdirectory

The CLI command files (`agent.ts`, `check.ts`, `init.ts`, `list.ts`, `next.ts`, `validate.ts`) currently live directly in `lib/cli/` alongside infrastructure files like `main.ts`, `types.ts`, and `settings.ts`.

Move the command implementations into a `lib/cli/commands/` subdirectory to make the separation between commands and infrastructure clearer.

## Goals

- [Organized Concerns](../goals/organized-concerns.md)

## Blocked by

(none)

## Definition of done

- [ ] Create `lib/cli/commands/` directory
- [ ] Move `agent.ts` to `lib/cli/commands/agent.ts`
- [ ] Move `check.ts` to `lib/cli/commands/check.ts`
- [ ] Move `init.ts` to `lib/cli/commands/init.ts`
- [ ] Move `list.ts` to `lib/cli/commands/list.ts`
- [ ] Move `next.ts` to `lib/cli/commands/next.ts`
- [ ] Move `validate.ts` to `lib/cli/commands/validate.ts`
- [ ] Move corresponding test files alongside their implementations
- [ ] Update imports in `main.ts` to reference new paths
- [ ] All tests pass
