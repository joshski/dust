# Display Core Principles in CLI

Update `dust principles` to show both core and local principles as separate hierarchies.

## Context

When a user runs `dust principles`, they should see all principles affecting their agents in one place. Core principles (from the dust package) and local principles (from their `.dust/principles/` directory) should appear as separate hierarchies.

## Scope

Update `lib/cli/commands/list.ts` to:

1. Load core principles using the core-principles API
2. Display "Core" hierarchy section (filtered by config excludes)
3. Display "Local" hierarchy section (existing behavior)
4. Handle empty sections gracefully

Output format:

```
🎯 Principles

Principles are guiding values and design constraints...

Core
Enable Flow State
├── Human-AI Collaboration
│   ├── Ideal Agent Developer Experience
│   │   └── ...

Local
Ship Fast
├── Minimal Reviews
└── ...
```

If no local principles exist, only show Core section. If core principles are all excluded, only show Local section.

## Principles

- [Progressive Disclosure](../principles/progressive-disclosure.md)
- [Unsurprising UX](../principles/unsurprising-ux.md)

## Blocked By

(none)

## Definition of Done

- `dust principles` displays Core and Local sections
- Core section excludes Internal and user-excluded principles
- Local section shows principles from `.dust/principles/`
- Empty sections are handled gracefully
- Output formatting matches existing hierarchy style
- Unit tests cover the new display logic
- `dust check` passes
