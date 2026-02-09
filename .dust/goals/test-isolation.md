# Test Isolation

Tests should not interfere with one another. Each test must be independently runnable and produce the same result regardless of execution order or which other tests run alongside it.

This means:
- No shared mutable state between tests
- No reliance on test execution order
- No file system or environment pollution
- Each test sets up its own dependencies

Test isolation enables parallel execution, makes failures easier to diagnose, and prevents cascading false failures when one test breaks.

## Parent Goal

- [Make Changes with Confidence](make-changes-with-confidence.md)

## Sub-Goals

- [Environment-Independent Tests](environment-independent-tests.md)
