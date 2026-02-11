# Compensate for agents potentially truncating dust agent output

When an agent runs `dust agent` (or any dust command), the tool output may be truncated by the agent's infrastructure before the agent sees it. This means critical instructions — especially routing commands at the end of the greeting — could be lost, causing the agent to stall or ignore dust's workflow entirely.

Agent platforms like Claude Code impose limits on tool output length. If the output of `dust agent` exceeds that limit (for example, when the `## Project Instructions` section from AGENTS.md is long), the greeting's most important content — the numbered command routing list — appears at the end and is the first thing truncated.

This is a structural problem: the current template puts context first and calls-to-action last, which is the opposite of what truncation-resilient output needs.
