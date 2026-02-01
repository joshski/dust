# Agent Agnostic

Dust should work with multiple agents without favoring one.

Rather than implementing agents, Dust generates prompts and context that can be passed to any capable agent. This keeps Dust lightweight and allows teams to use whatever agent tooling they prefer.

Dust may have built-in support for invoking popular agents (Claude, Aider, Codex, etc.), but the choice of agent should always be made by the user at runtime - never hard-coded into repository configuration.

Note: Supporting multiple agents directly contributes to [Easy Adoption](easy-adoption.md), since teams can use their preferred agent tools without being locked into a specific platform.

## Parent Goal

- [Agent Autonomy](agent-autonomy.md)

## Sub-Goals

- (none)
