# Improve artifact-writing instructions

Make artifact-writing instructions consistently teach opening-sentence rules so agents produce valid artifacts on the first attempt.

## Context

Agents are asked to create and edit dust artifacts in several flows, but the guidance is not fully consistent with what lint enforces:

- `lib/lint/validators/content-validator.ts` enforces a valid opening sentence and a 150-character limit for all content files, and imperative form for task openings.
- `lib/cli/commands/new-task.ts` tells agents to use an imperative opening sentence for tasks, but does not mention the 150-character constraint.
- `lib/cli/commands/new-idea.ts` describes idea creation and Open Questions format, but does not explicitly call out opening-sentence requirements.
- `lib/artifacts/workflow-tasks.ts` generates capture/refine/decompose task instructions, but these instructions emphasize structure and research steps more than concise opening-sentence quality in newly created artifacts.

This mismatch likely contributes to avoidable lint failures and retry loops when agents write artifacts.

## Proposed Direction

Create a single, reusable artifact-writing guidance block and apply it consistently across instruction surfaces that ask agents to author artifacts.

Initial scope:

- `dust new idea`
- `dust new task`
- capture idea task templates (`createIdeaTask`)
- refine/decompose idea task templates where artifact updates are expected

The shared guidance should explicitly cover:

- opening sentence required immediately after H1
- first sentence should be short and punchy (explicitly aligned to lint's 150-character rule)
- imperative opening sentence for task files
- reminder to run `dust lint` before commit

## Open Questions

### Where should we prioritize this guidance?

#### Option: Instruction-first

Improve all authoring instructions up front (new-task/new-idea/workflow templates) and keep lint messages mostly as they are.

#### Option: Lint-first

Keep instructions light and invest primarily in richer lint remediation messages when violations occur.

#### Option: Both

Add concise up-front guidance and also improve lint fix messaging so both prevention and recovery paths are strong.

### How strict should phrasing guidance be in instructions?

#### Option: Mirror lint rules exactly

Teach concrete rules directly (required sentence, 150-char cap, imperative task opening), matching validator behavior one-to-one.

#### Option: High-level wording guidance

Use softer guidance such as "short and punchy" and "action-oriented", while relying on lint for exact limits.

#### Option: Layered guidance

Give high-level writing advice first, then add an explicit "lint-compatible" checklist with exact constraints.
