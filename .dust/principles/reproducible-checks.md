# Reproducible Checks

Every check must produce the same result regardless of who runs it, when, or on what machine. If a check passes for one developer but fails for another, the check is broken.

Concretely, checks should pin their tool versions via the project's dependency manager (e.g. `devDependencies`) rather than relying on `npx`/`bunx` to fetch the latest version at runtime. Unpinned versions introduce non-determinism — a check that passed yesterday may fail today due to a tool upgrade that nobody chose to adopt.

## Parent Principle

- [Make Changes with Confidence](make-changes-with-confidence.md)

## Sub-Principles

- (none)
