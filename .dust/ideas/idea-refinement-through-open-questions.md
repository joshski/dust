# Idea Refinement Through Open Questions

Refine ideas by choosing among options in a structured "Open Questions" section. Each choice triggers an agent task to update the idea accordingly.

## Concept

Ideas in `.dust/ideas/` can include an "Open Questions" section with a defined structure: each question (h3) has multiple options (h4), each discussing the consequences of that choice. A product owner reviews these and selects an option. That selection is submitted as a task for an agent, which rewrites the idea to reflect the decision — removing the unchosen options, integrating the chosen one into the idea's design, and surfacing any new questions the choice reveals.

The commit history of an idea file becomes a reasoning trail: each commit represents a decision point where the idea got more specific. You can read the log to understand not just what was decided, but the sequence of refinements that shaped the idea.

## How it works

1. An idea file has an `## Open Questions` section with questions and options
2. A UI presents the open questions to a product owner
3. The product owner selects an option for one or more questions
4. Each selection creates a task: "Refine idea X: apply decision Y"
5. An agent picks up the task and updates the idea file:
   - Incorporates the chosen option into the idea's design sections
   - Removes the resolved question and its unchosen alternatives
   - Adds any new open questions that the decision reveals
6. If open questions remain (including newly surfaced ones), the idea stays as an idea
7. If no open questions remain, the idea is fully specified and a human decides whether to promote it to one or more tasks

## Open Questions structure

The structure must be validated by `dust lint markdown` so that tooling can reliably parse it:

```markdown
## Open Questions

### Question text here?

#### Option name

Discussion of consequences.

#### Another option

Discussion of consequences.

### Another question?

#### Option A

Discussion.
```

Rules:
- `## Open Questions` must be the exact h2 heading text
- Each h3 under it must be a question (content is freeform)
- Each h4 under a question is an option (content is freeform)
- Each question must have at least 2 options
- The section is optional — ideas without open questions are valid

## What "resolved" looks like

When a question is resolved, the agent doesn't just delete the alternatives. It weaves the decision into the body of the idea. For example, if the idea says "stream events to a server" and the product owner resolves the transport question by choosing WebSockets, the idea's design section should be updated to say "stream events over WebSockets" with relevant design details pulled up from the option's discussion. The Open Questions section shrinks; the rest of the idea grows.

This means the idea file always reads as a coherent document, not a decision log with strikethroughs.

## Relationship to tasks

A fully-specified idea doesn't automatically become a task. Some ideas are small enough to map to a single task. Others (like Progress Broadcasting) are epics that need decomposition into multiple tasks. The promotion step — "this idea is ready, turn it into work" — stays deliberate and human-driven.

The pipeline is: idea → (resolve questions) → specified idea → (decompose + prioritise) → task(s).

## Open Questions

### Should resolved decisions be preserved anywhere?

#### Git history only

Resolved questions disappear from the idea file entirely. The decision and its alternatives live only in the commit history. This keeps the idea file clean and forward-looking. The cost is that you need to dig through git log to understand why a decision was made, which most people won't do.

#### A "Decisions" section in the idea file

Resolved questions move to a `## Decisions` section that records what was chosen and why. This makes the reasoning visible without leaving the file, but the file grows over time and mixes active design with historical rationale. It also adds another section that validation needs to understand.

#### A separate decisions log file

Each idea gets a companion file (e.g. `idea-name.decisions.md`) that records resolved questions. This keeps the idea file focused on current design while preserving rationale in a discoverable location. The cost is file proliferation and the need to keep the two files in sync.

### How should the UI present choices?

#### Web form generated from markdown

Parse the Open Questions structure and render it as a form with radio buttons for each option. The product owner reads the consequence discussion and selects. This is simple and maps directly to the markdown structure. It doesn't support nuance like "option A but with a twist" — the product owner can only pick what's there.

#### Conversational interface

Present the questions in a chat-like interface where the product owner can discuss options with an agent before committing to a choice. This supports richer interaction — the product owner might ask follow-up questions, propose hybrid options, or refine the question itself. The cost is significantly more complexity and the risk of open-ended conversations that don't converge on a decision.

#### Comment and choose

The product owner selects an option but can also attach a comment explaining their reasoning or requesting modifications. The agent receives both the choice and the comment when refining the idea. This balances structure with flexibility — you get a clear decision plus the ability to steer the refinement.

### Should agents be able to add open questions without human prompting?

#### Yes, agents surface questions during any idea work

Whenever an agent works on an idea (refining it, implementing related tasks, or reviewing the codebase), it can append new questions to the Open Questions section. This means the idea evolves organically as the system learns more. The risk is question bloat — agents might surface low-value questions that clutter the idea and fatigue the product owner.

#### Only during explicit refinement tasks

Agents only add questions when they're executing a refinement task triggered by a product owner's decision. This keeps the question flow tightly coupled to human-initiated actions and prevents unsolicited noise. The cost is that the system can't proactively surface important questions it discovers during other work.

#### Agents propose, humans approve

Agents can suggest new questions at any time, but they go to a staging area rather than directly into the idea file. A human reviews proposed questions and decides which to add. This prevents bloat but adds friction and another review surface.
