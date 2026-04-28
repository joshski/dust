# Code examples in facts

Encourage facts that describe code-shaped behaviour to include short (3-10 line) snippets from the actual codebase. Concrete examples measurably improve agent code reuse.

## Background

[Augment Code's research on AGENTS.md files](https://www.augmentcode.com/blog/how-to-write-good-agents-dot-md-files) reports that short snippets (3-10 lines) drawn from real production code boosted code reuse by ~20% in their evaluations. Agents shown a short example of an existing pattern (e.g., a Redux Toolkit slice) reused it instead of inventing a parallel one.

Dust facts already tend to describe how things work today. Some include code (e.g., [build-artifact-patch](../facts/build-artifact-patch.md), [task-file-format](../facts/task-file-format.md)). Many do not. A fact like [workflow-task-repository](../facts/workflow-task-repository.md) describes an interface that an agent will likely consume — a short signature snippet would let the agent write correct calling code without reading the source.

## Proposed Solution

Two complementary directions, either or both:

1. **Convention** — Document in `bin/dust how to write a fact` and the writing guidance that facts about code APIs should include a 3-10 line snippet showing typical usage. Offer canonical examples from existing facts.

2. **Audit** — Add a stock audit (e.g., `code-examples-in-facts`) that flags facts whose body references functions, exports, or interfaces but contains no fenced code block. Output an idea per flagged fact suggesting that an example be added.

Snippets must be drawn from real code (not fabricated) so they stay accurate as the codebase evolves. A future enhancement could verify snippets against current source via a check.

## Principle Alignment

- [Progressive Disclosure](../principles/progressive-disclosure.md) — a short example reveals the API surface without forcing the agent to read the implementation
- [Context Window Efficiency](../principles/context-window-efficiency.md) — a 5-line example beats reading a 200-line module
- [Naming Matters](../principles/naming-matters.md) — usage examples make naming decisions concrete

## Open Questions

### Should snippets be verified against source?

#### No verification

Trust the author. Snippets drift over time but remain illustrative. Lowest implementation cost.

#### Lint-time verification

A check parses fenced code blocks in facts and confirms each line appears verbatim somewhere in the repo. Catches drift but adds friction when refactors land.

#### Embed-from-source syntax

Allow facts to reference source by file and line range (e.g., `<!-- embed: lib/foo.ts:10-20 -->`) and have a build step inline the snippet. Keeps facts and source synchronised at the cost of tooling complexity.

### Should this apply to principles too?

#### Facts only

Facts document current state, where examples make sense. Principles describe values, where examples can become prescriptive in unhelpful ways.

#### Facts and principles

Principles often have an "applying this principle" section that benefits from a concrete example. Broader application but risks turning principles into recipe books.
