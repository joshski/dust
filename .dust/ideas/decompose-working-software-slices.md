# Decompose working software slices

Encourage agents to decompose ideas into tasks that deliver slices of "fully working software" instead of components.

When an idea is broken into tasks, agents tend to create component-oriented tasks like "add database schema", "build API endpoint", "create UI form". Each task produces an artifact, but nothing works end-to-end until all of them are done. If any single task fails or stalls, there's no usable increment.

Instead, agents should be guided to slice vertically: each task delivers a thin but complete path through the system that a user could actually exercise. For example, "support creating a widget with a name field" is a single task that touches the database, API, and UI — but results in working software that can be tested and built upon.

This matters especially for autonomous agents working in loops, where each iteration should leave the codebase in a demonstrably better state.

## Open Questions

### Where should this guidance live?

#### In the task generation templates

Add slicing heuristics directly to the templates that agents use when decomposing ideas into tasks. This is the most direct intervention point.

#### In a goal or principle document

Capture it as a stated goal or principle that agents reference when planning. Less prescriptive, but applies broadly.

#### In the `dust agent` prompt

Include it in the agent startup prompt so it influences all agent behavior from the start of a session.
