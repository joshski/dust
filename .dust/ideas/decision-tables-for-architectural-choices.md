# Decision tables for architectural choices

Support decision tables in dust artifacts so agents can resolve recurring "which option here?" questions without inferring answers from prose.

## Background

[Augment Code's research on AGENTS.md files](https://www.augmentcode.com/blog/how-to-write-good-agents-dot-md-files) reports a 25% improvement in best-practices adherence when agent docs included a decision matrix for common architectural choices (their example: React Query vs. Zustand for different state-management cases). The table form forces a definitive answer, so agents stop guessing between equally-valid-looking options.

Dust currently captures decisions in two indirect ways: principles state values, and ideas with `## Open Questions` capture *unresolved* choices. There is no first-class place to record a *resolved* recurring choice — a decision an agent must apply many times across the codebase ("for X kind of validation, use this; for Y, use that").

## Proposed Solution

Introduce a convention (and possibly a parser) for decision tables inside facts. A fact body would include a section like:

```markdown
## Decision Table

| When | Use | Why |
|------|-----|-----|
| Validating user input at a CLI boundary | `lib/validation/cli` | Returns formatted error strings for output |
| Validating an artifact patch | `@joshski/dust/validation` | Returns structured `ValidationResult` for programmatic use |
```

Two implementation tiers:

1. **Convention only** — Document the pattern in fact-writing guidance. Agents and humans use it; nothing parses it. Lowest cost.

2. **Parsed and indexed** — Extend `parseFact()` to extract `decisionTable` entries and expose them. `dust facts --decisions` could list every recorded "when X, use Y" mapping. Higher value for agent context, more code to maintain.

This complements `## Open Questions` on ideas: open questions are *pending* choices, decision tables are *settled* choices that need to be applied repeatedly.

## Principle Alignment

- [Traceable Decisions](../principles/traceable-decisions.md) — a decision table records why a choice was made, alongside the choice itself
- [Agent Autonomy](../principles/agent-autonomy.md) — agents resolve recurring choices without re-asking
- [Progressive Disclosure](../principles/progressive-disclosure.md) — the table summarises choices an agent would otherwise have to reconstruct from multiple files

## Open Questions

### Should decision tables be a new artifact type or live inside facts?

#### Inside facts (section convention)

Reuses existing artifact infrastructure. A fact already documents how something works; a decision table fits naturally. Lowest friction.

#### New artifact type (`.dust/decisions/`)

First-class type with its own commands (`dust decisions`, `dust decision <name>`). Cleaner semantics — facts describe state, decisions describe choices. More infrastructure to build and maintain.

#### Section in principles

Principles already encode values and trade-offs. Adding decision tables to principles keeps "how to choose" near "why we choose."

### How should table rows be structured?

#### Free-form markdown table

Author decides columns. Maximum flexibility, no parsing.

#### Required columns: When / Use / Why

Structured enough to parse and index. Forces authors to articulate the trigger, the answer, and the reason.

#### Required columns plus a "scope" column

Adds a column indicating where the decision applies (file glob, module, etc.). Enables tooling to surface the right decision for the file being edited, but requires more discipline to fill in correctly.
