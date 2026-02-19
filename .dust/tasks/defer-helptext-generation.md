# Defer HELPTEXT generation

Replace the eagerly-generated module-level `HELP_TEXT` constant in `lib/cli/main.ts` with call-time generation using the configured `dustCommand`. See [Defer HELPTEXT generation](../ideas/defer-helptext-generation.md) for analysis.

## Goals

- [Dependency Injection](../goals/dependency-injection.md)

## Blocked By

(none)

## Definition of Done

- [ ] `HELP_TEXT` is no longer a module-level constant with a hardcoded `dustCommand`
- [ ] Help text is generated at call time using the configured command name
- [ ] All existing tests pass
