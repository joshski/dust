# Add a goal of "Keep unit tests pure"

Unit tests (those run very frequently) should be pure and side-effect free. Per [Michael Feathers' definition](https://www.artima.com/weblogs/viewpost.jsp?thread=126923), a test is **not** a unit test if it:

- Accesses a database
- Communicates over a network
- Touches the file system
- Cannot run concurrently with other tests
- Requires special environment setup

The value of pure unit tests is that they are fast, deterministic, and isolate business logic from infrastructure concerns. When unit tests pass but integration tests fail, developers can immediately narrow the problem to the boundary layer — a "binary chop" that accelerates debugging.

## Context

Several related goals already exist in this project:

- **[Test Isolation](../goals/test-isolation.md)** — Tests should not interfere with one another, with no file system or environment pollution. "Keep Unit Tests Pure" would be a natural sub-goal here.
- **[Environment-Independent Tests](../goals/environment-independent-tests.md)** — Tests must not depend on ambient environment variables, current working directory, network availability, or user identity. This is closely related but focuses specifically on environment variables rather than all side effects.
- **[Functional Core, Imperative Shell](../goals/functional-core-imperative-shell.md)** — Separating pure logic from I/O makes most code trivially testable without mocks or stubs. A "pure unit tests" goal reinforces this pattern from the test side.
- **[Stubs Over Mocks](../goals/stubs-over-mocks.md)** — In-memory emulators keep tests hermetic (no network, no shared state). The "Keep Unit Tests Pure" goal provides the principle that motivates choosing in-memory emulators over real infrastructure.
- **[Fast Feedback Loops](../goals/fast-feedback-loops.md)** — Pure unit tests are the fastest kind of test and are central to a tight change-and-verify loop. Impure "unit" tests slow the loop and erode the benefit.
- **[Unit Test Coverage](../goals/unit-test-coverage.md)** — Emphasises that unit tests provide the fastest, most specific feedback. Pure tests are a precondition for that promise.

The codebase already uses `stubEnv` and dependency injection to control environment variables in tests (see `environment-independent-tests.md`), which aligns with the principle of keeping unit tests pure.

## Proposed Goal

A new goal file at `.dust/goals/keep-unit-tests-pure.md` defining "pure unit tests" as tests that:

- Do not access the file system
- Do not communicate over the network
- Do not access a database
- Can run concurrently with other tests
- Require no special environment setup beyond what the test itself provides

The goal would sit under **Test Isolation** as a sibling or sub-goal of **Environment-Independent Tests**, since it generalises the same concern from environment variables to all side effects.

## Open Questions

### Where does this goal sit in the hierarchy?

#### As a sub-goal of Test Isolation

"Keep Unit Tests Pure" subsumes "Environment-Independent Tests" (environment variables are one kind of side effect). It could replace or absorb that goal, or sit alongside it as a broader sibling.

#### As a sibling of Test Isolation under Make Changes with Confidence

The purity concern is slightly different from isolation (two tests can be impure without interfering with each other). A separate branch may more clearly communicate intent.

#### As a sub-goal of Fast Feedback Loops

The primary motivation in Feathers' article is speed. Placing the goal here emphasises that pure tests exist to keep feedback fast, not just to improve correctness.

### Should "Environment-Independent Tests" become a sub-goal of this new goal?

Environment independence is a specific form of test purity. If "Keep Unit Tests Pure" is introduced, "Environment-Independent Tests" could become one of its sub-goals rather than a sibling. This would require updating the hierarchy in both files.

#### Yes, absorb it as a sub-goal

Environment independence is one specific instance of test purity. Nesting it under "Keep Unit Tests Pure" makes the hierarchy more coherent and avoids duplication.

#### No, keep them as siblings

The existing goal is already well-established with its own file and links. Restructuring the hierarchy adds churn without clear benefit; the two goals can coexist independently.

### What counts as a "unit test" for this goal?

The test suite currently runs under both Vitest and Bun. Both run tests that are already largely pure, but there is no explicit enforcement mechanism. Should the goal include guidance on how to detect or enforce purity (e.g., via lint rules, sandboxing, or categorisation by file naming convention)?

#### Enforcement via lint rules

Add a lint rule (e.g., a Biome custom rule or ESLint plugin) that flags imports of `fs`, `net`, or similar modules in files matching a `*.unit.test.ts` naming pattern.

#### Enforcement via test runner sandboxing

Use a test runner option (e.g., Bun's `--smol` or a custom preload) to intercept and fail on disallowed I/O within designated test files.

#### Convention only, no enforcement

Document the goal and rely on code review and developer discipline. Simpler to adopt but harder to maintain as the codebase grows.

### How does this goal interact with system tests?

The project already distinguishes between unit tests (run frequently, fast) and system tests. Does the new goal need to explicitly define that distinction, or should it reference an existing or planned "Test Pyramid" or "Test Categories" goal?

#### Define the distinction inline in the goal file

Include a brief definition of "unit test" within the goal itself to make the scope self-contained and unambiguous.

#### Reference an existing or future categorisation goal

Keep the goal focused on purity and link to a separate goal (existing or to be created) that defines the test taxonomy.

### Should the goal describe what to do with tests that are currently impure?

Some existing test helpers (e.g., those creating temporary files or spawning processes) may not be pure. The goal could include guidance on migrating impure tests to use in-memory alternatives, or it could simply apply to new tests going forward.

#### Include migration guidance

Provide explicit direction on how to convert impure tests to use in-memory alternatives, making the goal actionable for existing code.

#### Apply to new tests only

Keep the goal forward-looking. Existing impure tests can be migrated opportunistically without mandating a migration effort up front.
