# Commit Log Observations

Encourage agents to log surprising discoveries in commit messages, then scan commit history to extrapolate patterns and observations over time.

## Concept

Rather than maintaining separate session state, leverage git commit logs as a durable record of agent observations. Agents should be encouraged to note anything surprising or unexpected in their commit messages. A tool could then scan commit history to surface recurring themes, lessons learned, and emergent patterns.

## Relationship to Executive Decisions

This complements the "Executive Decision Logging" idea but focuses on the read side: extracting value from what's already been logged. Together they form a feedback loop:

1. Agents log surprises and decisions in commits
2. A scanning tool identifies patterns across many commits
3. Patterns inform new facts, principles, or process improvements

## Possible Commands

- `bin/dust scan commits` — analyze recent commit messages for observations
- `bin/dust observations` — show extracted patterns and recurring themes
- `bin/dust learn` — suggest new facts based on commit history patterns

## Why This Matters

- **Session Continuity**: Context persists across sessions via git history
- **Human-AI Collaboration**: Humans gain visibility into what agents discover
- **Maintainable Codebase**: Patterns can reveal systemic issues worth addressing
