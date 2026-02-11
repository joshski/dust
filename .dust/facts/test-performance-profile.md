# Test Performance Profile

Profiling data collected to understand where time is spent running tests, and how resources are shared, reused, or recreated between tests.

## Summary

| Runner | Scope | Tests | Wall clock | User CPU | Sys CPU |
|--------|-------|-------|-----------|----------|---------|
| `bun test` | all (unit + system) | 718 across 45 files | 3.5s | 1.0s | 0.2s |
| `bun test lib/` | unit tests only | 670 across 34 files | 3.4s | 0.8s | 0.2s |
| `bun test system-tests/` | system tests only | 48 across 11 files | 0.4s | 0.4s | 0.1s |
| `bunx vitest run` | unit tests only | 670 across 34 files | 4.5s | 13s | 8s |
| `bunx vitest run --coverage` | unit tests + coverage | 670 across 34 files | 4.7s | 14s | 8s |

Bun is ~4x faster in wall-clock time and ~13x more CPU-efficient than vitest for the same 670 unit tests.

## Vitest Timing Breakdown

Vitest reports its own internal timing as:

```
Duration  3.9s (transform 4.6s, setup 0ms, import 8.2s, tests 3.6s, environment 4ms)
```

The internal numbers exceed wall-clock time because vitest runs 34 test files in parallel across forked workers. Each worker independently transforms and imports modules, so the aggregate transform/import time is the sum across all workers.

### Where the time goes (vitest)

1. **Real-time waits in check.test.ts: ~2.7s** — Two tests use `setTimeout(resolve, 1500)` and `setTimeout(resolve, 1200)` to verify timing display. These are real wall-clock waits that cannot be parallelised away. They dominate the test execution time.

2. **Module transform + import: ~1s effective** — Each forked worker must independently parse and transform TypeScript modules. The aggregate is 4.6s transform + 8.2s import across all workers, but parallelism reduces the wall-clock impact to ~1s.

3. **All other tests: <1s** — The remaining 668 tests complete in under 1 second of wall-clock time.

### Vitest parallelism/isolation comparison

| Mode | Duration | Notes |
|------|----------|-------|
| Default (parallel, isolated) | 3.9s | Each file in its own forked worker |
| `--no-file-parallelism` | 16.9s | Sequential files, but each still isolated (new worker per file) |
| `--no-isolate` | 3.8s | All files share one worker, modules imported once |

The `--no-file-parallelism` run is 4x slower because the 2.7s real-time waits in check.test.ts can't overlap with other test files. The `--no-isolate` run is similar to default because the parallelism benefit is small (most test time is the check.test.ts waits anyway).

### Per-file vitest test time (tests phase only, not import/transform)

| File | Test time | Notes |
|------|-----------|-------|
| check.test.ts | 2,870ms | 2 tests with real setTimeout (1500ms + 1200ms) |
| loop.test.ts | 224ms | Uses EventEmitter with setTimeout(0) for process simulation |
| pre-push.test.ts | 86ms | Multiple filesystem emulator setups |
| lint-markdown.test.ts | 38ms | 127 tests, all fast |
| main.test.ts | 35ms | 32 tests |
| init.test.ts | 30ms | 27 tests |
| All others | <25ms each | |

### Per-file vitest import time (isolated, single file runs)

| File | Transform | Import | Notes |
|------|-----------|--------|-------|
| main.test.ts | 342ms | 418ms | Imports all commands via `main.ts` |
| wire.test.ts | 342ms | 419ms | Imports all commands via `wire.ts` → `main.ts` |
| loop.test.ts | 185ms | 245ms | Imports loop + EventEmitter |
| lint-markdown.test.ts | 171ms | 214ms | Large command module |
| pre-push.test.ts | 167ms | 212ms | Multiple imports |
| Most others | 50-100ms | 75-150ms | Single command import |

The main.ts and wire.ts files are the import bottleneck because they eagerly import every command module. In isolated single-file runs, this costs ~420ms per file. When running the full suite in parallel, this cost is amortised across workers.

## Bun Timing

Bun runs all 718 tests (670 unit + 48 system) in 3.5s wall clock. Individual file timings:

| File | Bun time | Tests |
|------|----------|-------|
| check.test.ts | 2,910ms | 35 (dominated by setTimeout waits) |
| loop.test.ts | 152ms | 53 |
| main.test.ts | 83ms | 32 |
| pre-push.test.ts | 70ms | 45 |
| lint-markdown.test.ts | 64ms | 127 |
| init.test.ts | 61ms | 27 |
| All others | <60ms | |

Bun's startup and module resolution is significantly faster: a single-file run starts in ~40-80ms vs vitest's ~1000ms per file (including bunx overhead, vitest bootstrap, worker fork, and transform).

## Heap Usage (vitest --logHeapUsage)

All test files use 10-14 MB heap. No file stands out:

- Largest: loop.test.ts at 14 MB, pre-push.test.ts at 13 MB
- Most files: 10-12 MB
- The check.test.ts tests that wait 2.7s use only 9-10 MB

Memory is not a bottleneck.

## Resource Sharing/Reuse/Recreation Between Tests

### Pattern: Fresh emulators per test, no sharing

Every test creates its own `createContextEmulator()` and `createFileSystemEmulator()` inline. There is no `beforeEach` creating shared fixtures. Examples:

- lint-markdown.test.ts: 37 context + 48 filesystem emulators for 127 tests
- pre-push.test.ts: 23 context + 23 filesystem emulators for 45 tests
- check.test.ts: 27 context + 27 filesystem emulators for 35 tests

This is by design — the project favours test isolation (see `.dust/goals/test-isolation.md`). Each test gets a fresh in-memory filesystem and output capture.

### Cost of emulator creation: negligible

The `createFileSystemEmulator()` function creates a few Maps and a closure object. The `createContextEmulator()` creates two arrays and a closure. These are trivially cheap — microseconds per creation. The filesystem tree flattening (`flattenFileSystemTree`) does O(n) work on the tree depth, but test trees are small (typically 3-5 entries).

### No shared state between test files

- vitest default: each file runs in an isolated forked worker (no module sharing between files)
- vitest `--no-isolate`: modules are shared across files in a single worker, saving ~0.1s
- bun test: runs all files in one process, modules loaded once

### Cross-runtime compatibility

Test utilities use a `stubEnv`/`restoreEnv` pattern for environment variables that works identically in both vitest and bun. The `originalEnvValues` Map is module-level state, but since `restoreEnv()` is called in `afterEach`, it resets between tests.

## The Single Dominant Bottleneck

**The two `setTimeout` tests in check.test.ts account for 2.7s of the 3.6-3.9s total test execution time (vitest) and 2.7s of 3.4s (bun).** Everything else — 668 other tests, all emulator creation, all assertions — fits in under 1 second.

These tests verify that the check command displays elapsed time for slow checks. They use real `setTimeout` delays (1500ms and 1200ms) rather than fake timers because the code under test (`check.ts`) directly calls `Date.now()` for timing.

### If the real-time waits were eliminated

| Runner | Current | Without check.test.ts waits |
|--------|---------|---------------------------|
| bun test (all) | 3.5s | ~0.8s |
| vitest run | 4.5s | ~1.8s (startup + transform) |

Vitest's irreducible floor is higher because of the per-run startup cost (bunx resolution, vitest bootstrap, worker forking, TypeScript transform). Bun's floor is lower because it natively understands TypeScript and doesn't need a transform step.
