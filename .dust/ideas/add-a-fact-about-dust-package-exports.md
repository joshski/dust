# Add a fact about dust package exports

Document the package exports of `@joshski/dust` for downstream consumers.

## Context

The package.json defines five exports that downstream consumers can import:

1. **`@joshski/dust/types`** - Public type definitions for the event protocol, workflow tasks, and idea structures. Types-only export (no runtime code).

2. **`@joshski/dust/logging`** - Debug logging framework with file and stdout channels. Provides `createLogger`, `enableFileLogs`, and `isEnabled`.

3. **`@joshski/dust/agents`** - Agent detection module for identifying which AI coding agent environment is running (Claude Code, Claude Code Web, Codex, or unknown).

4. **`@joshski/dust/artifacts`** - Repository interface for reading and manipulating dust artifacts (principles, facts, ideas, tasks) and workflow task operations.

5. **`@joshski/dust/istanbul/minimal-reporter`** - Custom Istanbul coverage reporter that shows incomplete coverage with line-level gap details.

These exports enable third-party tools and extensions to integrate with dust's artifact system, event protocol, and logging infrastructure.

## Open Questions

### Should the fact include usage examples?

#### Option: Include examples
Show import statements and basic usage for each export. Makes the fact more actionable for developers but increases maintenance burden.

#### Option: Keep it minimal
Document what each export provides without code examples. Keeps the fact focused on "what exists" rather than "how to use it".

### Should the fact reference related documentation?

#### Option: Cross-reference existing facts
Link to related facts like npm-publishing.md and configuration-system.md where relevant.

#### Option: Standalone fact
Keep the fact self-contained without cross-references. Simpler to maintain but may miss connections.
