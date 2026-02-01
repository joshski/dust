# Goal Hierarchy Design

Goals are organized in a single-parent tree hierarchy rather than a multi-parent directed acyclic graph (DAG).

## Structure

Each goal file contains:
- `## Parent Goal` — exactly one parent (or `(none)` for root goals)
- `## Sub-Goals` — zero or more child goals

The hierarchy has two root goals: **Maintainable Codebase** (how we develop dust) and **Human-AI Collaboration** (what dust offers users).

## Trade-offs

**Why a tree instead of a DAG:**
- Simpler to understand and navigate — trees are intuitive
- Clean display — `bin/dust goals` produces a readable indented tree
- Forces prioritization — picking one parent clarifies primary purpose
- Aligns with the Small Units goal — keeping structures simple

**Limitation:** Some goals naturally support multiple parents. For example, "Small Units" supports both "Agent Autonomy" and "Lightweight Planning".

**Workaround:** When a goal has significant secondary relationships, add a prose note in the goal file explaining the connection. This captures the nuance without complicating the hierarchy structure.

## Example

See `.dust/goals/small-units.md` for a goal that has Agent Autonomy as its primary parent but includes a note about its relationship to Lightweight Planning.
