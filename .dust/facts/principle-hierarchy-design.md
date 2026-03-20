# Principle Hierarchy Design

Principles are organized in a single-parent tree hierarchy rather than a multi-parent directed acyclic graph (DAG).

## Structure

Each principle file contains:
- `## Parent Principle` — exactly one parent (or `(none)` for root principles)
- `## Sub-Principles` — zero or more child principles

The hierarchy has one root principle: **Enable Flow State** (with `## Parent Principle` of `(none)`). This root has two sub-principles: **Maintainable Codebase** (how we develop dust) and **Human-AI Collaboration** (what dust offers users).

## Trade-offs

**Why a tree instead of a DAG:**
- Simpler to understand and navigate — trees are intuitive
- Clean display — `bin/dust principles --tree` produces a readable indented tree
- Forces prioritization — picking one parent clarifies primary purpose
- Aligns with the Small Units principle — keeping structures simple

**Limitation:** Some principles naturally support multiple parents. For example, "Small Units" supports both "Agent Autonomy" and "Lightweight Planning".

**Workaround:** When a principle has significant secondary relationships, add a prose note in the principle file explaining the connection. This captures the nuance without complicating the hierarchy structure.

## Example

See `.dust/principles/small-units.md` for a principle that has Agent Autonomy as its primary parent but includes a note about its relationship to Lightweight Planning.
