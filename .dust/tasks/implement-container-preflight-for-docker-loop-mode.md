# Implement Container Pre-flight for Docker Loop Mode

When `docker` and `containerRuntime` are set in `IterationOptions`, `runOneIteration` should build a container-aware `ShellRunner` and pass it to `runPreflightChecks`. This ensures the install command and `dust check` run inside the container, matching the environment used by the agent.

## Context

`runOneIteration` (in `lib/loop/iteration.ts`) currently selects its `ShellRunner` at line 405:

```ts
const shellRunner = loopDependencies.shellRunner ?? defaultShellRunner
```

This always runs pre-flight on the host — even when `docker` is present in `IterationOptions`. The fix is to:

1. Add `containerRuntime?: ContainerRuntime` to `IterationOptions`
2. In `loop.ts`, pass `containerRuntime` into `iterationOptions`
3. In `runOneIteration`, when both `options.docker` and `options.containerRuntime` are set, build a container-aware `ShellRunner` that wraps each command as:

   ```
   <runCommand> run --rm -v <repoPath>:/workspace -w /workspace [envs] <imageTag> sh -c "<command>"
   ```

   Use `containerRuntime.buildRunArgs(config)` as the pure function that produces these args. The `ShellRunner` is the thin imperative shell that spawns the process.

4. Pass `gitProxyUrl` from `docker` to the `RunConfig` (resolved question: pass it through)
5. Use `settings.dustCommand` unchanged for `dust check` inside the container (resolved question: reuse as-is)

The repo is volume-mounted, so files written by the install step persist on the host and are available to the subsequent `dust check` container invocation.

## Resolved Questions

### Should `gitProxyUrl` be passed to container pre-flight?

**Decision:** Pass `gitProxyUrl` to the container shell runner

### Should `settings.dustCommand` be used as-is for container pre-flight?

**Decision:** Reuse `settings.dustCommand` unchanged

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Design for Testability](../principles/design-for-testability.md)
- [Dependency Injection](../principles/dependency-injection.md)
- [Stubs Over Mocks](../principles/stubs-over-mocks.md)
- [Comprehensive Test Coverage](../principles/comprehensive-test-coverage.md)
- [Keep Unit Tests Pure](../principles/keep-unit-tests-pure.md)

## Guidance

### Functional Core, Imperative Shell

Separate code into a pure "functional core" and a thin "imperative shell." The core takes values in and returns values out, with no side effects. The shell handles I/O and wires things together.

Purely functional code makes some things easier to understand: because values don't change, you can call functions and know that only their return value matters—they don't change anything outside themselves.

The functional core contains business logic as pure functions that take values and return values. The imperative shell sits at the boundary, reading input, calling into the core, and performing side effects with the results. This keeps the majority of code easy to test (no mocks or stubs needed for pure functions) and makes the I/O surface area small and explicit.

**Application here:** `containerRuntime.buildRunArgs(config: RunConfig) => string[]` is the pure function that computes docker/container CLI arguments. The container-aware `ShellRunner` is the thin imperative shell that calls `buildRunArgs`, appends the command, and spawns the process. Keep the argument-building logic in `buildRunArgs` and keep the shell runner thin.

---

### Design for Testability

Design code to be testable first; good structure follows naturally.

Testability should be a primary design driver, not a quality to be retrofitted. When code is designed to be testable from the start, it naturally becomes decoupled, explicit in its dependencies, and clear in its interfaces.

The discipline of testability forces good design: functions become pure, dependencies become explicit, side effects become isolated. Rather than viewing testability as a tax on production code, recognize it as a compass that points toward better architecture.

This is particularly important in agent-driven development. Agents cannot manually verify their changes—they rely entirely on tests. Code that resists testing resists autonomous modification.

**Application here:** The container-aware `ShellRunner` should be unit-testable without spawning real processes. Structure it so a stub/fake `ShellRunner` can be substituted in tests.

---

### Dependency Injection

Avoid global mocks. Dependency injection is almost always preferable to testing code that depends directly on globals.

When code depends on global state or singletons, testing requires mocking those globals—which introduces hidden coupling, complicates test setup, and risks interference between tests. Dependency injection makes dependencies explicit: they're passed in as arguments, making the code's requirements visible and enabling tests to supply controlled implementations.

**Application here:** `containerRuntime` should be passed into `IterationOptions` rather than read from a global or module-level import. This makes `runOneIteration` testable without real Docker.

---

### Stubs Over Mocks

Prefer hand-rolled stubs over mocks, in unit tests. Stubs keep tests focused on observable behavior instead of implementation details.

Mocks tend to encode a script of "expected calls" (what was invoked, in what order, with what arguments). That makes tests brittle: harmless refactors can break tests even when the externally visible behavior is unchanged. You end up maintaining tests that police how the code works rather than what it does.

Stubs (and especially in-memory emulators) push tests toward the contract: provide inputs, run the code, assert outputs and side effects.

**Application here:** In tests for `runOneIteration`, use a stub `ShellRunner` that records commands and returns controlled results — not a mock with expected-call assertions.

---

### Comprehensive Test Coverage

A project's test suite is its primary safety net, and agents depend on it even more than humans do.

Agents cannot manually verify that their changes work. They rely entirely on automated tests to confirm correctness. Gaps in test coverage become gaps in agent capability — areas where changes are risky and feedback is absent.

**Application here:** Add tests that verify:
- When `docker` and `containerRuntime` are set, pre-flight commands are wrapped in container run args
- When only `docker` is set (no `containerRuntime`), the host shell runner is used (backward compat)
- When neither is set, behavior is unchanged

---

### Keep Unit Tests Pure

Unit tests (those run very frequently as part of a tight feedback loop) should be pure and side-effect free. A test is **not** a unit test if it accesses a database, communicates over a network, touches the file system, cannot run concurrently with other tests, or requires special environment setup.

**Application here:** Tests for the container-aware pre-flight path must not spawn real Docker processes. Use a stub `ContainerRuntime` with a fake `buildRunArgs` implementation.

## Task Type

implement

## Blocked By

(none)

## Definition of Done

- `IterationOptions` in `lib/loop/iteration.ts` has a `containerRuntime?: ContainerRuntime` field
- `loop.ts` threads `containerRuntime` into `iterationOptions`
- `runOneIteration` builds a container-aware `ShellRunner` when both `options.docker` and `options.containerRuntime` are present; otherwise falls back to the existing behavior
- The container-aware `ShellRunner` uses `containerRuntime.buildRunArgs({ imageTag, repoPath, homeDir, gitProxyUrl })` to compute run args, then runs `sh -c "<command>"` inside the container
- `gitProxyUrl` is passed from `options.docker` to the `RunConfig`
- `settings.dustCommand` is used as-is for `dust check` inside the container
- Unit tests cover the three behavioral cases: container runner active, docker-only fallback, no-docker unchanged
- Tests use stub `ContainerRuntime` and stub `ShellRunner` — no real Docker processes spawned
- `bin/dust check` passes
