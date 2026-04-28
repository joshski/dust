# Pair prohibitions with concrete alternatives

Audit principles and facts so every "don't X" rule is paired with a concrete "do Y" alternative. Prohibition-only guidance pushes agents into over-verification.

## Background

[Augment Code's research on AGENTS.md files](https://www.augmentcode.com/blog/how-to-write-good-agents-dot-md-files) found that prohibitions paired with concrete alternatives ("Don't instantiate HTTP clients directly — use the shared `apiClient` from `lib/http`") significantly outperformed warning-only documentation. Bare "don't" rules made agents overly cautious and exploratory: instead of writing code, they kept verifying their work against every warning.

Several dust principles follow this pattern well already (e.g., [stubs-over-mocks](../principles/stubs-over-mocks.md), [dependency-injection](../principles/dependency-injection.md) — "avoid global mocks" but the body explains the alternative). Others state a prohibition without an obvious paired remedy. A reader skimming the index sees only "Don't repeat yourself" or "avoid X" without the actionable counterpart.

## Proposed Solution

Add a stock audit (e.g., `prohibition-with-alternative`) that scans `.dust/principles/` and `.dust/facts/` for sentences matching "don't", "do not", "avoid", "never" and confirms the same artifact contains a paired positive direction ("use", "prefer", "instead", "do this"). The audit produces an idea per artifact whose prohibitions lack a clear alternative, so a human or agent can refine the wording.

This is structural enough to flag candidates but semantic enough that the resulting work belongs in an idea, not a lint failure.

## Principle Alignment

- [Actionable Errors](../principles/actionable-errors.md) — guidance that says "don't" without "do" is a non-actionable warning
- [Agent Autonomy](../principles/agent-autonomy.md) — agents need to know what to do, not only what to avoid
- [Context Window Efficiency](../principles/context-window-efficiency.md) — paired rules avoid the verification loop the article describes

## Open Questions

### Where should this audit run?

#### Only on `.dust/principles/`

Principles are the most rule-shaped artifact. Limiting scope keeps signal high and false positives low.

#### On principles and facts

Facts also state behavioural rules (e.g., "the file format must X"). Broader scope catches more cases but may flag facts that document a constraint rather than a rule.

#### On all `.dust/` artifacts plus `AGENTS.md` and `CLAUDE.md`

Maximum coverage. Catches the case the article actually warns about — but `AGENTS.md` content varies widely and may have many false positives.

### How strict should the pairing detection be?

#### Same-paragraph pairing

Require the alternative to appear in the same paragraph as the prohibition. Strict but precise; often forces noisy rewrites.

#### Same-file pairing

Require the alternative to appear anywhere in the same file. More forgiving and matches how readers actually consume an artifact.

#### LLM-judged pairing

Let an LLM decide whether each prohibition has a satisfying counterpart. Highest quality but most expensive and least reproducible.
