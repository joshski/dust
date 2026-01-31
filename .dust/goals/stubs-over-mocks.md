# Stubs over mocks

Prefer hand-rolled stubs over mocks, in unit tests. Stubs keep tests focused on observable behavior instead of implementation details.

Mocks tend to encode a script of “expected calls” (what was invoked, in what order, with what arguments). That makes tests brittle: harmless refactors (changing internal decomposition, adding caching, batching calls, reordering operations) can break tests even when the externally visible behavior is unchanged. You end up maintaining tests that police how the code works rather than what it does.

Stubs (and especially in-memory emulators) push tests toward the contract: provide inputs, run the code, assert outputs and side effects. When a test fails, it’s usually because a behavior changed, not because the internal call choreography shifted. That improves signal-to-noise, reduces rewrites during refactors, and makes it easier to evolve the implementation.

For external dependencies (databases, queues, object stores, HTTP services), the default choice should be an in-memory emulator: a drop-in replacement that is faithful enough to the real interface/semantics but runs entirely in-process. It gives most of the benefits of integration testing—realistic state transitions, error modes, concurrency behavior where relevant—without the cost, flakiness, and setup burden of booting real infrastructure. It also keeps the test environment hermetic (no network, no shared state), which improves determinism and makes tests fast.

Still use mocks selectively—mainly to assert something is called (e.g., telemetry emission, "at most once" notifications, payment capture guarded by a feature flag) or when a dependency is impossible to emulate. But for most cases, stubs and in-memory emulators produce tests that are clearer, more resilient to refactoring, and better aligned with the system's actual contracts.

## Parent Goal

- [Decoupled Code](decoupled-code.md)

## Sub-Goals

- (none)
