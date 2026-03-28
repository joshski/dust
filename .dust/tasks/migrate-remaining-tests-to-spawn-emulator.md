# Migrate Remaining Tests to Spawn Emulator

Replace all remaining local spawn mock implementations across the test suite with the shared `createSpawnEmulator()` from test-utilities. This completes the consolidation by migrating loop, docker, container, and CLI command tests.

## Context

After migrating repository.test.ts, these test files still have local spawn mocks:
- `lib/loop/loop.test.ts`, `lib/loop/git-pull.test.ts`, `lib/loop/iteration.test.ts` - Git pull focus
- `lib/proxy/git-credential-proxy.test.ts` - Credential helper simulation
- `lib/docker/docker-agent.test.ts` - Docker command testing
- `lib/container/apple-container-runtime.test.ts`, `lib/container/docker-runtime.test.ts` - Container runtime testing
- `lib/cli/commands/loop-claude.test.ts`, `lib/cli/commands/loop-codex.test.ts` - Loop command testing

Each should be migrated individually, removing local helpers and using the shared emulator.

## Principles

- [Stubs Over Mocks](../principles/stubs-over-mocks.md)
- [Make Changes with Confidence](../principles/make-changes-with-confidence.md)
- [Reasonably DRY](../principles/reasonably-dry.md)

## Task Type

implement

## Blocked By

- [Migrate Repository Tests to Spawn Emulator](../tasks/migrate-repository-tests-to-spawn-emulator.md)

## Repository Hints

Some tests have simpler spawn patterns (just exit codes), while others need stdout/stderr emission. The emulator should handle all these patterns cleanly.

## Definition of Done

- All local spawn helper functions removed from listed test files
- All tests use `createSpawnEmulator()` from test-utilities
- All existing test assertions pass across the entire test suite
- No test behavior changed
- Single source of truth for spawn emulation
