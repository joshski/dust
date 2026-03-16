# Design for Testability Principle

Add a principle capturing dust's philosophy of designing for testability first.

## Context

The dust codebase consistently prioritizes testability as a primary design driver, not merely a secondary concern. This manifests throughout the codebase:

- **Dependency injection everywhere** — commands receive injected `FileSystem` and `CommandContext` for testability without spawning processes
- **Extracted functions for coverage** — helper functions like `createLogCallbacks()` and `buildEventMessage()` are extracted specifically "for testability (v8 coverage limitation)"
- **In-memory emulators** — `FileSystemEmulator`, `ContextEmulator` provide test doubles without real infrastructure
- **Functional core pattern** — pure functions that take values in and return values out, making testing trivial

The existing principle hierarchy acknowledges this implicitly:
- **Decoupled Code** mentions testability as a benefit: "Decoupled code is easier to test, understand, and modify"
- **Dependency Injection** explicitly states: "This approach improves testability"
- **Stubs Over Mocks** is entirely about better testing approaches

However, none of these capture the deliberate inversion: that dust designs *for* testability first, and accepts the resulting decoupling as a welcome consequence. This is philosophically different from designing for other goals and hoping testability follows.

## Rationale

The insight is that testability is an excellent proxy for good design. When code is hard to test, it usually signals:
- Hidden dependencies (global state, singletons)
- Tight coupling between concerns
- Side effects mixed with logic
- Unclear interfaces

Designing for testability first addresses these issues proactively. The discipline of asking "how will I test this?" before writing code leads to better architecture than asking "how do I retrofit tests onto this?" afterward.

This principle also aligns with dust's agent-centric philosophy: agents rely entirely on automated tests since they cannot manually verify changes. Code designed for testability is code designed for autonomous modification.

## Proposed Principle

**Name:** Design for Testability

**One-liner:** Design code to be testable first; good structure follows naturally.

**Body:**
Testability should be a primary design driver, not a quality to be retrofitted. When code is designed to be testable from the start, it naturally becomes decoupled, explicit in its dependencies, and clear in its interfaces.

The discipline of testability forces good design: functions become pure, dependencies become explicit, side effects become isolated. Rather than viewing testability as a tax on production code, recognize it as a compass that points toward better architecture.

This is particularly important in agent-driven development. Agents cannot manually verify their changes — they rely entirely on tests. Code that resists testing resists autonomous modification.

**Suggested parent:** Decoupled Code

**Relationship to existing principles:**
- Elevates testability from a benefit mentioned in other principles to a first-class design driver
- Explains *why* the codebase uses patterns like dependency injection and functional core
- Connects testing philosophy to agent autonomy

## Open Questions

### Where should this principle sit in the hierarchy?

#### Option: Child of Decoupled Code

Testability is closely related to decoupling — testable code is inherently decoupled. Placing it under Decoupled Code positions it as a technique for achieving decoupling. This keeps the existing hierarchy structure and groups related concepts.

#### Option: Sibling of Decoupled Code (under Make Changes with Confidence)

Designing for testability is arguably more fundamental than decoupling itself — it's the *reason* to decouple. As a sibling, it can stand as an independent principle that justifies the other sub-principles (Dependency Injection, Stubs Over Mocks, etc.).

#### Option: Parent of the testing sub-principles

If testability is the driving philosophy, it could become the parent principle with Dependency Injection, Stubs Over Mocks, and Functional Core as children. This would require restructuring the hierarchy but might more accurately reflect the design philosophy.
