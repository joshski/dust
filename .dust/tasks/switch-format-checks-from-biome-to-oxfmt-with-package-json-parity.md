# Switch format checks from Biome to oxfmt with package.json parity

Replace Biome formatting checks with `oxfmt` while preserving current `package.json` formatting output exactly.

## Principles

- [Fast Feedback Loops](../principles/fast-feedback-loops.md)
- [Minimal Dependencies](../principles/minimal-dependencies.md)
- [Reproducible Checks](../principles/reproducible-checks.md)
- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)

## Relevant Facts

- [Configuration System](../facts/configuration-system.md)
- [Package Exports](../facts/package-exports.md)
- [Task File Format](../facts/task-file-format.md)

## Blocked By

- [Switch lint from Biome to oxlint with custom policy checks](./switch-lint-from-biome-to-oxlint-with-custom-policy-checks.md)

## Definition of Done

- [ ] `dust check` runs formatting through a distinct `oxfmt --check` step (separate from lint).
- [ ] Formatting behavior for `package.json` remains exactly aligned with current repository output, including key ordering.
- [ ] Scope is limited to code/config formatting; `.dust/` markdown formatting remains unchanged.
- [ ] Biome formatter/config artifacts are removed once oxfmt-based checks pass end-to-end.
- [ ] Facts/docs are updated to reflect OXC formatting commands and any explicit `package.json` handling.
