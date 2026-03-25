# More emulators

Look for ways we can use more high-level, hermetic emulators instead of low-level mocks.

## Current State

The codebase strongly favors emulators over mocks (see [Stubs Over Mocks](../principles/stubs-over-mocks.md)). Several emulators already exist:

- **FileSystemEmulator** (`lib/test-support/test-utilities.ts`) - In-memory file system with read/write tracking
- **ContextEmulator** (`lib/test-support/test-utilities.ts`) - Captures stdout/stderr for assertions
- **ShellEmulator** (`system-tests/support/shell-emulator.ts`) - Executes CLI commands in-memory
- **AgentEmulator** (`system-tests/support/agent-emulator.ts`) - Pattern-based AI session simulation
- **VCR cassettes** (`lib/claude/vcr.ts`) - Record/replay for Claude Code interactions

Despite this, some lower-level patterns remain:

1. **Process stream spying** - `vi.spyOn(process.stdout, 'write')` in `lib/logging/index.test.ts`
2. **Global fetch assignment** - `globalThis.fetch = ...` in `lib/bucket/auth.test.ts`
3. **EventEmitter stubs for spawn** - Manual ChildProcess-like objects in `lib/bucket/repository.test.ts`, `lib/claude/spawn-claude-code.test.ts`
4. **Date.now spying** - `vi.spyOn(Date, 'now')` in `lib/cli/commands/check.test.ts`
5. **WebSocket stubs** - Manual WebSocketLike objects in `lib/bucket/events.test.ts`

## Open Questions

### Should we create an HTTP emulator?

#### Create FetchEmulator

The `globalThis.fetch` assignments in auth tests are ad-hoc and require manual cleanup. A `FetchEmulator` could queue expected responses, track requests, and integrate with `stubEnv` patterns. Similar to VCR but for HTTP rather than Claude Code events.

#### Option: Use existing VCR pattern

Extend the VCR cassette approach to handle HTTP interactions, unifying the record/replay mechanism across both Claude Code and HTTP dependencies.

#### Option: Keep ad-hoc fetch stubs

The current approach is simple and only used in one test file. Creating an abstraction may be over-engineering for limited usage.

### Should we create a spawn/process emulator?

#### Create SpawnEmulator

Multiple test files create EventEmitter-based spawn stubs. A `SpawnEmulator` could standardize this pattern with configurable exit codes, stdout/stderr emissions, and timing control. Would consolidate patterns from `repository.test.ts` and `spawn-claude-code.test.ts`.

#### Option: Create ProcessEmulator

Go broader with a full process emulator covering spawn, exec, and fork. Could also handle process.stdout/stderr spying that currently uses `vi.spyOn`.

#### Option: Keep per-test factories

The current approach (e.g., `createMockSpawn()`, `createAutoResolvingSpawn()`) is already well-factored per test file. Sharing might introduce coupling between unrelated tests.

### Should we create a clock/time emulator?

#### Create TimeEmulator

`Date.now` spying appears in timeout tests. A `TimeEmulator` with methods like `advance(ms)` could control Date.now and potentially setTimeout/setInterval without using `vi.spyOn`. Aligns with the stubs-over-mocks philosophy.

#### Option: Accept vi.spyOn for Date.now

Date.now spying is minimal (2 occurrences), read-only, and doesn't encode call-order expectations. The stubs-over-mocks principle explicitly allows mocks for impossible-to-emulate cases.

### Should LoggingSink replace stdout spying?

#### Inject LoggingSink dependency

The logging tests spy on `process.stdout.write` to capture debug output. Modifying the logging module to accept an optional sink (similar to how FileSystem is injected) would let tests use an in-memory sink instead.

#### Option: Keep stdout spying for logging tests

The logging module's purpose is writing to stdout. Abstracting away stdout might make tests less realistic. The spy pattern is localized and well-understood.
