# Move Workflow Task Hints Lower

Workflow task hints are currently injected immediately after each task template's opening sentence. Move these interpolated hints lower in the generated task so core instructions remain uninterrupted and repo-specific guidance appears closer to where it is most actionable.

## Context

Workflow hints are loaded from `.dust/config/hints/*.md` via `readWorkflowHint(...)` in `lib/artifacts/workflow-tasks.ts`.

Today, all task generators append the hint directly to the opening sentence:

- `createIdeaTransitionTask(...)` sets `openingSentence` to `baseOpeningSentence + "\n\n" + hint` for Refine/Decompose/Shelve tasks.
- `createIdeaTask(...)` uses the same pattern for Add Idea and Expedite Idea tasks.

Tests explicitly lock in this behavior by asserting that the hint appears immediately after the final sentence of opening guidance:

- `lib/artifacts/workflow-tasks.test.ts` checks this for refine, decompose, shelve, add, and expedite task types.

This placement makes hints highly visible, but it also mixes repo-specific guidance into a long first paragraph that already contains workflow-critical instructions.

## Why change it

For capture and transition tasks, the first block is dense and canonical. Inserting custom hints there can dilute scanability and make it harder for agents to quickly parse required workflow rules.

Placing hints lower could improve clarity by preserving a stable primary instruction block while still surfacing repository conventions before execution.

## Proposed Direction

Add an explicit section for repository-specific hints and render it lower in the task template.

Candidate layout for all workflow task types:

1. Opening sentence (core dust workflow instructions only)
2. `## Idea Description` (or the existing idea-link section for transition tasks)
3. `## Repository Hints` (only when a hint file exists)
4. Remaining standard sections (`## Blocked By`, `## Definition of Done`, etc.)

Implementation likely centers on `renderTask(...)` and capture-task string templates in `lib/artifacts/workflow-tasks.ts`, plus test expectation updates in `lib/artifacts/workflow-tasks.test.ts`.

## Open Questions

### Where should interpolated hints be placed in the template?

#### Option: Add a dedicated `## Repository Hints` section before `## Definition of Done` (Recommended)

Keeps custom guidance visible but separate from canonical opening instructions. Applies consistently across all workflow task types.

#### Option: Place hints after `## Idea Description` without a dedicated heading

Minimizes structural changes but may make hint boundaries less obvious, especially when hints are multi-paragraph.

#### Option: Keep current placement in opening sentence

No migration cost, but retains current scanability issue.

### Should hint placement change for all workflow task types or only capture tasks?

#### Option: Change all task types (Recommended)

Single mental model and shared rendering behavior across refine/decompose/shelve/add/expedite tasks.

#### Option: Change only Add/Expedite tasks

Targets the most common intake flows first, but creates inconsistent layout semantics between capture and transition tasks.
