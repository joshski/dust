# Commit Log Observations

Scan commit history to extract patterns and observations from what agents have logged.

## Concept

Git commit logs are a durable record of what agents discovered and decided. A scanning tool could analyze commit history to surface recurring themes, lessons learned, and emergent patterns — then suggest new facts, principles, or process improvements based on what it finds.

## Related Ideas

This idea focuses on the *read side* of commit message analysis:

- [Mention dust in commit messages](mention-dust-in-commit-messages.md) — identifying which commits came from dust sessions
- [History Tools](history-tools.md) — traversing commit history to retrieve deleted tasks

Together these form a feedback loop:
1. Agents log observations and decisions in commits
2. A scanning tool identifies patterns across many commits
3. Patterns inform new facts, principles, or process improvements

## Why This Matters

- **Session Continuity**: Context persists across sessions via git history
- **Human-AI Collaboration**: Humans gain visibility into what agents discover
- **Maintainable Codebase**: Patterns can reveal systemic issues worth addressing

## Relevant Principles

- [Traceable Decisions](../principles/traceable-decisions.md) — commit messages should explain why, not just what
- [Atomic Commits](../principles/atomic-commits.md) — each commit tells a complete story

## Open Questions

### What patterns should the scanner look for?

#### Option: Free-form text analysis

Use an LLM to analyze commit message bodies for themes, surprises, and recurring observations. Flexible but may produce inconsistent results.

#### Option: Structured markers

Define conventions like `Observation:` or `Surprise:` prefixes that agents should use. More reliable parsing but requires coordination with the write side.

#### Option: Section-based parsing

Look for specific sections in commit messages (like the existing "Investigation found..." pattern). Works with natural commit message structure.

### How should extracted patterns be surfaced?

#### Option: Interactive report

A `dust observations` command that displays themes and suggests actions. Human-in-the-loop review before any changes.

#### Option: Automated suggestions

Generate draft fact or principle files in a staging area (e.g., `.dust/suggestions/`) for human review.

#### Option: Integration with existing workflows

Surface observations when relevant — e.g., show related patterns when creating a new task or refining an idea.

### Should this depend on the "write side" ideas first?

#### Option: Implement independently

Build the scanner to work with whatever exists in commit history today. Some commits already include observations naturally.

#### Option: Wait for structured logging

Implement after "Executive Decision Logging" or "Mention dust in commit messages" to ensure there's consistent input to scan.

#### Option: Develop together

Coordinate both sides simultaneously to ensure the format used for logging is optimized for scanning.
