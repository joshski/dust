# Spawn Emulator

Create a shared SpawnEmulator to consolidate the per-test-file spawn mock patterns.

## Context

Multiple test files create nearly identical `createMockSpawn()` and `createAutoResolvingSpawn()` helper functions. Each provides EventEmitter-based ChildProcess stubs with configurable exit codes, stdout/stderr emissions, and timing control. This pattern appears in:

- `lib/bucket/repository.test.ts` - Most comprehensive implementation with process tracking
- `lib/loop/loop.test.ts`, `lib/loop/git-pull.test.ts`, `lib/loop/iteration.test.ts` - Git pull focus
- `lib/proxy/git-credential-proxy.test.ts` - Credential helper simulation
- `lib/docker/docker-agent.test.ts` - Docker command testing
- `lib/container/apple-container-runtime.test.ts`, `lib/container/docker-runtime.test.ts` - Container runtime testing
- `lib/cli/commands/loop-claude.test.ts`, `lib/cli/commands/loop-codex.test.ts` - Loop command testing

The implementations are similar but not identical - each is tailored to its test context. For example, `repository.test.ts` tracks all spawned processes in a Map by command string, while loop tests focus on git pull exit codes.

This aligns with the [Stubs Over Mocks](../principles/stubs-over-mocks.md) principle by providing in-memory process emulation rather than verifying call order.

## Open Questions

### Should we create a shared SpawnEmulator?

#### Create shared SpawnEmulator

Extract the spawn emulation pattern into a reusable `createSpawnEmulator()` in `lib/test-support/test-utilities.ts`. Would provide:
- Configurable exit codes and timing
- stdout/stderr emission helpers
- Process tracking by command pattern
- Auto-resolving mode for integration-style tests

Benefits: Single implementation to maintain, consistent behavior across tests, easier to enhance (e.g., add signal handling).

Risks: Current per-test helpers are already well-factored. Sharing might introduce coupling between unrelated tests or require additional configuration knobs to handle divergent needs.

#### Keep per-test factories

Maintain the current approach where each test file defines its own spawn helpers. The implementations are short, focused, and allow tests to evolve independently. The duplication cost is low (~15-30 lines per file) and the pattern is well-understood.

Benefits: No coupling between tests, easy to customize per-test requirements.

Risks: Bug fixes or enhancements must be applied to multiple files. Pattern drift over time as different test files evolve independently.

#### Create domain-specific emulators

Rather than a general spawn emulator, create focused emulators for common patterns: `GitProcessEmulator` (for git pull/push/clone), `DockerProcessEmulator` (for docker build/run), etc. Each would provide domain-specific helpers rather than generic process emulation.

Benefits: Type-safe APIs for specific commands, built-in knowledge of common patterns (e.g., git credential helpers, docker exit codes).

Risks: More surface area to maintain. May not be worth it if the current factories already serve their contexts well.
