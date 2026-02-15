# Slow Feedback Coping

Some feedback is unavoidably slow — dust should offer coping strategies rather than pretending it can be eliminated.

Integration tests, end-to-end tests, deployment pipelines, and external API calls all take time. Pretending they can be made instant is unrealistic. Instead, dust should help developers and agents cope with slow feedback effectively: by structuring work so that fast checks catch most problems early, by batching slow checks intelligently, by providing clear progress indicators, and by ensuring that when slow feedback does arrive, it is actionable and specific.

Strategies include separating fast and slow test suites, running slow checks asynchronously or in CI, caching expensive operations, and designing workflows that minimise how often slow feedback is needed.

## Parent Goal

- [Ideal Agent Developer Experience](ideal-agent-developer-experience.md)

## Sub-Goals

- (none)
