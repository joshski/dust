# Length budget for agent entry files

Lint or audit `AGENTS.md` and `CLAUDE.md` to flag growth past a length budget (~150 lines). Beyond that threshold, entry files reverse their own gains.

## Background

[Augment Code's research on AGENTS.md files](https://www.augmentcode.com/blog/how-to-write-good-agents-dot-md-files) measured a 10-15% quality improvement from a focused 100-150 line `AGENTS.md` paired with referenced detail documents. Beyond that length, gains reversed: agents over-explored, loaded irrelevant context, and produced lower-quality work than with no documentation at all.

`dust init` writes a small instruction into `AGENTS.md` and `CLAUDE.md` (see [agents-md-instruction](../facts/agents-md-instruction.md)). Downstream projects then add their own content. Over time these files accumulate — lengthy onboarding notes, repository-specific quirks, project-specific rules — and there is currently no signal when they cross the threshold the article identifies.

This is a project-level concern: dust itself has only a small `CLAUDE.md`, but downstream adopters can grow theirs without realising the cost. Dust's stop-the-line and lint-everything principles suggest catching this at check time.

## Proposed Solution

Add a check (either an audit producing an idea, or a lint warning) that flags `AGENTS.md` and `CLAUDE.md` when they exceed a configurable line budget. The default would mirror the article: warn over 150 non-blank lines, error over ~250.

The output should not just say "too long" — it should suggest progressive disclosure: extract sections into `.dust/facts/` or repository-specific reference files and replace the inline content with a link.

## Principle Alignment

- [Progressive Disclosure](../principles/progressive-disclosure.md) — directly enforces the principle on agent entry points
- [Context Window Efficiency](../principles/context-window-efficiency.md) — keeps the always-loaded preamble small
- [Lint Everything](../principles/lint-everything.md) — turns a known agent-quality concern into a static check

## Open Questions

### Should this be a lint failure or an audit-driven idea?

#### Lint failure (warn → error at higher threshold)

Surfaced every check run. Stops growth before it accumulates. May annoy adopters who deliberately keep large files.

#### Audit producing an idea

Surfaced when an audit task is dispatched. Lets the project decide whether and when to act. Lower friction, slower feedback.

#### Both — lint warns, audit refines

Lint warns when the file is over budget, an audit then examines the content to suggest specific extractions. Strongest signal but most code to maintain.

### What should the line budget be?

#### Mirror the article: 150 lines

Aligns with the research that motivated the idea. Concrete and defensible.

#### Configurable, defaulting to 150

Honours the article default but lets large monorepos opt for a higher budget. More flexible but invites the budget being silently raised forever.

#### Token budget, not line budget

What actually matters for agents is tokens, not lines. Measure with a tokenizer. More accurate but adds a dependency and obscures the user-facing number.

### Should `dust agent` output count toward the budget?

#### No — only the static files count

`dust agent` output is generated, and its length is dust's responsibility, not the project's.

#### Yes — measure the combined preamble agents see

Agents load both. Measuring them together reflects the real cost. Forces dust itself to keep `dust agent` lean, which is consistent with the principle.
