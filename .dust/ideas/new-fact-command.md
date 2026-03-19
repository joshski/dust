# New fact command

`dust new fact` should provide guidance for agents to write new fact files. This follows the established pattern of other `dust new` commands.

## Context

Facts are current state documentation that capture how things work today. They sit in the middle of the artifact stability spectrum — more stable than ideas and tasks, but more volatile than principles. Facts provide context for agents and contributors by documenting implementation details, architectural decisions, and system behavior.

Existing facts in this codebase demonstrate several patterns:

- **Simple declarations** (`bun-runtime.md`, `command-syntax.md`) — document a single design decision with brief rationale
- **Format specifications** (`task-file-format.md`, `idea-file-format.md`) — define structure for other artifacts
- **System documentation** (`configuration-system.md`, `docker-agent-mode.md`) — explain how features work with implementation details

All fact files share the same structure: H1 title, opening sentence, and optional body sections. The opening sentence appears in `dust facts` output, so it should be a concise summary.

## Implementation

Following the pattern established by other `new` commands in `lib/cli/commands/`:

1. Create `lib/cli/commands/new-fact.ts` following the same structure as `new-principle.ts`
2. Register the command in `lib/cli/main.ts`
3. Provide guidance that explains:
   - What facts are (current state documentation)
   - When to create a fact vs. other artifacts
   - The file structure and naming convention
   - How to write a good opening sentence (appears in listings)
   - Example content patterns (simple vs. detailed)

## Open Questions

### What guidance should distinguish facts from other artifacts?

#### Focus on "what is" vs "what should be"

Emphasize that facts document current reality — not aspirations (principles) or future work (ideas/tasks). A fact answers "how does this work today?" rather than "how should this work?"

#### Focus on stability and change frequency

Emphasize that facts should only be created for decisions that have been made and implemented. Facts need updating when the underlying system changes, unlike principles which are relatively permanent.

### Should the guidance include examples of different fact types?

#### Yes, include categorized examples

The guidance could categorize facts (format specifications, system documentation, design decisions) with brief examples of each. This helps agents understand when to create detailed vs. simple facts.

#### No, keep guidance minimal

Simpler guidance reduces cognitive load and lets agents discover patterns by reading existing facts via `dust facts`. The command could just direct agents to run `dust facts` for examples.
