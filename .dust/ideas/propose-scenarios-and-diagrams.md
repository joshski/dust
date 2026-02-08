# Propose scenarios and diagrams

Agents should propose new ideas as "high-level scenarios" or diagrams — anything that helps with efficient human digestion of the proposed solution. Rather than jumping straight into implementation details, agents could first present a visual or narrative overview that communicates the shape of a change before committing to code.

This could include sequence diagrams, flowcharts, before/after comparisons, or short user-facing scenarios that illustrate how a feature would work in practice.

## Open Questions

### What format should diagrams use?

#### Mermaid

Widely supported in GitHub markdown rendering. Agents can produce mermaid syntax inline and it renders automatically in PRs, issues, and wiki pages.

#### ASCII art

Works everywhere with zero tooling dependencies, but harder for agents to produce consistently and less readable for complex diagrams.

#### Both, depending on context

Let agents choose the most appropriate format. Mermaid for structured diagrams (sequences, flowcharts), ASCII for simple inline sketches.

### Where should scenario proposals live?

#### In the idea or task file itself

Keeps everything co-located. The scenario is part of the idea's description, making it easy to review in one place.

#### In a separate `.dust/scenarios/` directory

Allows scenarios to be reused across multiple ideas or tasks, but adds indirection.

#### In commit messages or PR descriptions

Scenarios are transient artifacts for review, not permanent documentation. They belong in the communication layer rather than the file tree.
