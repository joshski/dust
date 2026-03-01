# Codebase overview command

Add a `dust overview` command that helps agents quickly orient themselves in unfamiliar codebases.

## Background

The [Exploratory Tooling](../principles/exploratory-tooling.md) principle states dust "should promote and integrate tools that help agents explore: dependency graphs, module overviews, search utilities tuned for code navigation, and summaries of project structure."

Currently, agents must manually explore codebases using generic tools (grep, glob, read). This works but can waste context on trial-and-error. A dedicated command could provide structured output optimized for agent consumption.

## Proposed Command

`dust overview` would output a structured summary of the repository:

### Output Sections

1. **Project type** - Detected from package.json, Cargo.toml, etc. (e.g., "TypeScript Node.js library")

2. **Entry points** - Main files, CLI entry points, exported modules

3. **Directory structure** - Top-level directories with their purposes:
   ```
   lib/           - Core library code (85 files)
   lib/cli/       - CLI commands
   lib/bucket/    - Bucket service integration
   ```

4. **Key files** - Files that are central (many imports, configuration files):
   ```
   lib/cli/main.ts - CLI entry point (imports 12 modules)
   lib/config/settings.ts - Configuration management
   ```

5. **Test structure** - Where tests live, test framework detected

6. **Dependencies** - Key dependencies and their purposes (not the full list)

## Why This Helps Agents

When an agent starts working on a task, it often needs to:
- Find where relevant code lives
- Understand how modules are organized
- Identify entry points for tracing execution

A structured overview reduces the "orientation" phase from many tool calls to a single command.

## Principle Alignment

- [Exploratory Tooling](../principles/exploratory-tooling.md) - Directly implements this principle
- [Context Window Efficiency](../principles/context-window-efficiency.md) - Structured output is scannable
- [Progressive Disclosure](../principles/progressive-disclosure.md) - Overview first, details on demand
- [Agent Autonomy](../principles/agent-autonomy.md) - Reduces need for human guidance

## Open Questions

### What format should the output use?

#### Markdown

Human-readable and parseable. Agents can extract sections they need. Matches dust's markdown-first philosophy.

#### JSON

Machine-readable. Agents can programmatically access specific fields. More verbose but unambiguous.

#### Both with a flag

`dust overview` outputs markdown by default, `dust overview --json` outputs JSON. Flexibility at the cost of implementation complexity.

### How should purposes be determined?

#### Heuristics from directory names

Infer purposes from common names (src, lib, test, docs). Simple and works across languages.

#### Parse README and comments

Extract descriptions from documentation. More accurate but depends on documentation existing.

#### Configuration file

Allow `.dust/config/overview.yaml` to define directory purposes. Most accurate but requires manual maintenance.
