# Mark Internal Principles

Add `## Applicability` sections to dust-specific principles, marking them as `Internal`.

## Context

The built-in principles feature requires distinguishing between universally applicable principles (which downstream users inherit) and dust-specific principles (which only apply to dust's own development). Internal principles will be filtered out when building the core principles list for downstream users.

## Scope

Add an `## Applicability` section with value `Internal` to these principles:

- `self-contained-repository` — about agent support and dust's repository optimization
- `development-traceability` — about what dust provides for structured logging
- `exploratory-tooling` — about tools dust promotes and integrates
- `debugging-tooling` — about what dust helps projects adopt
- `agent-context-inference` — about how dust interprets human inputs
- `agent-specific-enhancement` — about how dust enhances for specific agents
- `agent-agnostic-design` — about dust's internal architecture
- `batteries-included` — about dust's scope and packaging

The section should be placed between the opening description and the `## Parent Principle` section:

```markdown
# Principle Title

Opening description...

## Applicability

Internal

## Parent Principle

- [Parent](parent.md)
```

Universal principles (the default) do not need an Applicability section.

## Principles

- [Small Units](../principles/small-units.md)

## Blocked By

(none)

## Definition of Done

- All 8 principles listed above have `## Applicability: Internal` section
- Section placement is consistent: after opening description, before Parent Principle
- `dust lint` passes
