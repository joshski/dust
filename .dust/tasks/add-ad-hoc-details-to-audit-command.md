# Add ad-hoc details to audit command

Extend `dust audit <name>` to accept an optional free-form string that gets appended to the generated task file.

## Context

The audit command (`lib/cli/commands/audit.ts`) creates tasks from templates but offers no way to customize scope at creation time. Users often want to focus audits on specific areas (files, directories, commits) without editing the generated task afterwards.

## Implementation

Modify the audit command to accept an optional second positional argument:

```bash
dust audit security-review "Focus on authentication changes from last week"
```

The ad-hoc details should be:
1. Inserted as a new `## Ad-hoc Scope` section after the opening description, before `## Scope`
2. Only added when the user provides details
3. Passed through without validation (the agent interprets the natural language)

## Principles

- [Unsurprising UX](../principles/unsurprising-ux.md)
- [Easy Adoption](../principles/easy-adoption.md)

## Blocked By

(none)

## Definition of Done

- [ ] The audit command accepts an optional second argument for ad-hoc details
- [ ] When provided, ad-hoc details appear in a new `## Ad-hoc Scope` section in the generated task
- [ ] When not provided, the task file is generated unchanged
- [ ] Tests verify both cases (with and without ad-hoc details)
- [ ] Command help shows the optional argument
