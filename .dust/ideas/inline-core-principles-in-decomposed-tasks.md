# Inline Core Principles in Decomposed Tasks

Instruct decompose agents to embed relevant core principle content directly in task files. This ensures implementing agents read the guidance without extra tool calls.

## Motivation

Data from dustbucket shows that across 546 decompose sessions in 30 days:

- 95% of sessions list principles (`dust principles`)
- 52% read local principle files
- Only 2.6% read any core principle file
- Only 0.5% of created tasks reference core principles

Local principles get linked because they live at `../principles/` — a natural relative path. Core principles require running `dust core principle <name>`, which agents almost never do. The result is that 47 core principles (actionable-errors, design-for-testability, functional-core-imperative-shell, etc.) are effectively invisible to implementing agents.

## Proposed Change

Update the decompose workflow instructions to tell the decomposing agent: after selecting relevant principles, inline the core principle content directly into the task file (e.g. as a blockquote or collapsed section under `## Principles`). Local principles can remain as links since they're already accessible, but core principles should have their key guidance embedded so the implementing agent reads it as part of reading the task.

This means the implementing agent has no choice but to absorb the principle — it's part of the task definition, not a link they'd need to follow.

## Open Questions

### Where should inlined principles appear in the task file?

#### Blockquote under each principle link

Inline the principle content as a blockquote immediately after the link. Simple and visible.

#### Collapsed details section

Use a `<details>` block to keep the task file scannable while still embedding the full content.

#### Separate "Guidance" section

A new `## Guidance` section that contains curated excerpts from relevant core principles, distilled to what's actionable for this specific task.
