# Agent-Specific Enhancement

Dust should detect and enhance the experience for specific agents while remaining agnostic at its core.

While Dust has [Agent-Agnostic Design](agent-agnostic-design.md) and works with any capable agent, it can still optimize the "agent DX" (developer experience) when it detects a specific agent is being used. This means:

- **Detection** - Dust may detect which agent is running (e.g., Claude Code, Aider, Cursor) through environment variables, configuration, or other signals
- **Enhancement** - Once detected, Dust can tailor its output format, prompts, or context to leverage that agent's specific strengths
- **Graceful fallback** - When no specific agent is detected, Dust provides a generic experience that works with any agent

This principle complements Agent-Agnostic Design: the core functionality never requires a specific agent, but the experience improves when one is recognized.

## Parent Principle

- [Agent Autonomy](agent-autonomy.md)

## Sub-Principles

- (none)
