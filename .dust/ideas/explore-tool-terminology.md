# Explore tool terminology

Claude Code has an "Explore" tool described as: "Fast agent specialized for exploring codebases. Use this when you need to quickly find files by patterns, search code for keywords, or answer questions about the codebase."

Using terminology like "explore the codebase" in dust agent instructions could encourage Claude to use this tool effectively, rather than relying on sequential file reads or manual searches.

## Relevant locations

Key places where this terminology could be integrated:

- **Agent instruction templates** (`lib/templates/agent-*.txt`) - Currently use verbs like "read" and "understand" but don't mention exploration
- **Agent greeting** - Could suggest exploring the repository structure before diving into specific tasks
- **Task implementation instructions** - Could encourage exploring affected code before making changes
- **Task picking instructions** - Could mention exploring to understand task scope
- **System prompt infrastructure** - The existing `--system-prompt` capability in `lib/claude/spawn-claude-code.ts` could inject Explore guidance automatically

## Alignment with existing goals

The `agent-context-inference` goal already states: "The burden of context discovery shifts to the agent, which can use dust's CLI and repository structure to find what it needs." Explore tool terminology would reinforce this intent by guiding agents toward the right tool for context discovery.

## Example phrases that trigger exploration

- "Explore the codebase to understand..."
- "Explore the .dust files to find..."
- "Explore how similar features are implemented..."
- "Before implementing, explore the affected areas..."
