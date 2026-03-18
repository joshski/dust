# Remove Stock Audit Principle Sections

Remove the `## Principles` sections from all stock audit templates in `lib/audits/stock-audits.ts`.

## Background

Stock audit templates include `## Principles` sections with relative links like `[Decoupled Code](../principles/decoupled-code.md)`. When `dust audit <name>` creates a task file in a consumer repository, these links resolve to `.dust/principles/` files that don't exist in that repository, causing `dust lint` to report "Broken link" errors.

## Scope

1. Remove all `## Principles` sections from the stock audit templates in `lib/audits/stock-audits.ts`
2. The `checks-audit.ts` file may also contain Principles sections - check and remove if present

## Implementation

Each audit template contains a `## Principles` block that looks like:

```markdown
## Principles

- [Decoupled Code](../principles/decoupled-code.md)
- [Fast Feedback](../principles/fast-feedback.md)
```

These blocks appear between other sections (typically between `## Scope`/`## Analysis`/`## Applicability` and `## Blocked By`). Remove the entire block including the heading and all principle links.

For audits where `## Principles` contains `(none)`, remove those sections too for consistency.

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Easy Adoption](../principles/easy-adoption.md)

## Blocked By

(none)

## Definition of Done

- All `## Principles` sections removed from stock audit templates
- `bin/dust check` passes
- Consumer repositories no longer receive broken principle links in generated audit tasks
