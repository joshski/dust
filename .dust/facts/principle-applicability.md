# Principle Applicability

Principles can have an `## Applicability` section that controls whether they are inherited by downstream repositories.

## Values

- **This repository only** — The principle applies only to the dust project itself. It is excluded when generating CLAUDE.md or other configuration for downstream repositories.
- **All repositories** (or section omitted) — The principle is a core principle that applies to any project using dust. These are included when generating inherited configuration.

## Convention

The `## Applicability` section appears immediately before `## Parent Principle` in the principle file. Core principles simply omit the section — absence means "all repositories".

## Rationale

This keeps the principle hierarchy true to conceptual meaning (e.g., "Agent-Agnostic Design" stays under "Agent Autonomy" where it belongs) while still controlling inheritance. The alternative — restructuring dust-specific principles into a separate subtree — would distort the hierarchy to serve an inheritance mechanism rather than representing actual relationships.
