# Update README with Agent-Driven Installation

Replace the current manual installation instructions in README.md with agent-driven instructions that align with dust's agent-first philosophy.

## Context

The README currently shows manual npm commands for installation (README.md:11-14). Since dust exists to enable AI coding agents and users are by definition already using an agent, the installation process should leverage this.

## Implementation

Update the "Quick Start" section in README.md to use agent-driven installation:

```bash
claude "install dust as per https://github.com/joshski/dust"
```

Include a brief note that other agents (aider, cursor, etc.) work similarly.

The approach is:
- Agent-only (no manual fallback) to reinforce agent-first philosophy
- Uses GitHub repository URL for full context
- Direct command phrasing: "install dust"
- Agent-agnostic with one example and a note
- Lets the agent naturally continue to run `dust init`

## Principles

- [Agent Autonomy](../principles/agent-autonomy.md) - Let agents handle installation
- [Agent-Agnostic Design](../principles/agent-agnostic-design.md) - Work with multiple agents
- [Easy Adoption](../principles/easy-adoption.md) - Minimize installation friction
- [Unsurprising UX](../principles/unsurprising-ux.md) - Natural language commands

## Task Type

implement

## Blocked By

(none)

## Repository Hints

Really think about "Functional Core, Imperative Shell"

## Definition of Done

- README.md Quick Start section updated with agent-driven installation
- Manual npm commands replaced with agent command
- Brief note added about other agents working similarly
- Documentation flows naturally from installation to next steps
- Tests pass
