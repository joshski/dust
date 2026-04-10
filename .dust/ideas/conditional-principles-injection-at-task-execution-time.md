# Conditional principles injection at task execution time

Inject a condensed index of principles and facts into the task execution prompt, but only when the task doesn't already have a Guidance section.

## Background

Principles and facts are dust's knowledge base, but they only reach executing agents reliably when a `dust decompose` step has inlined them into the task's `## Guidance` section. Tasks created manually, via `dust implement`, or by editing markdown directly skip this step — so the executing agent has no principle context unless it happens to run `dust principles` itself (which is unreliable).

## Proposal

In `buildTaskPrompt` (lib/loop/iteration.ts), check whether `taskContent` contains a `## Guidance` heading:

- **If yes**: trust the baked-in guidance, don't inject anything extra (avoid distracting from carefully selected principles).
- **If no**: append a condensed index of all principles and facts (title + one-line description each) so the agent can self-select what's relevant.

This keeps well-decomposed tasks focused while ensuring manually-created tasks still benefit from the project's accumulated knowledge.

## Why not always inject?

If the task was well-decomposed, the relevant principles are already inlined. Adding a full index on top of that could distract from the principles that were specifically selected, tempt the agent to second-guess the task, or add noise when the task is narrow and well-defined.

## Open Questions

### Should we also inject when Guidance exists but is empty?

#### Yes, treat empty Guidance as missing

An empty `## Guidance` section likely means the decompose step didn't find relevant principles, but a condensed index is cheap and the executing agent might spot something the decomposing agent missed.

#### No, respect the decompose agent's judgment

If the decompose agent left Guidance empty, that was a deliberate choice. Overriding it undermines the decompose step.

### What should the condensed index look like?

#### Title + one-line description

Minimal token cost, enough for the agent to decide what to read in full via `dust principles <slug>`.

#### Title + scope tags

Include tags like `testing`, `docker`, `architecture` so the agent can quickly filter by relevance to the task at hand.
