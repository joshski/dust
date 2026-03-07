# Switch lint from Biome to oxlint with custom policy checks

Replace Biome linting with `oxlint` as the default lint engine.
Preserve current custom Biome GritQL policy intent via repository-owned checks.

## Principles

- [Minimal Dependencies](../principles/minimal-dependencies.md)
- [Fast Feedback Loops](../principles/fast-feedback-loops.md)
- [Lint Everything](../principles/lint-everything.md)
- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)

## Relevant Facts

- [Configuration System](../facts/configuration-system.md)
- [Biome Custom Rules](../facts/biome-custom-rules.md)
- [Task File Format](../facts/task-file-format.md)

## Blocked By

(none)

## Definition of Done

- [ ] `dust check` replaces the Biome lint step with an explicit `oxlint` lint step.
- [ ] Existing Biome custom rule intent (`dust-no-abbreviated-names`, `no-vitest-mocking`, `no-unsafe-double-cast`) is enforced without Biome, with violations failing checks.
- [ ] Custom-policy enforcement is implemented as a pure analysis core (input in, diagnostics out) plus a thin CLI/wiring shell.
- [ ] Lint checks intentionally adopt OXC defaults (no attempt at warning-by-warning parity with previous Biome output).
- [ ] Lint documentation/facts are updated to describe the new lint architecture and rule ownership.
