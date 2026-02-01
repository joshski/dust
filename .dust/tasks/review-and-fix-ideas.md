# Review and Fix Ideas

Review all ideas in `.dust/ideas/` and fix any inaccurate details such as outdated terminology, incorrect file paths, or obsolete references.

## Background

Ideas can become stale as the codebase evolves. This task ensures that ideas remain accurate and actionable by correcting any outdated information.

## Known Inaccuracies

The following issues have been identified and need to be fixed:

1. **`decouple-loop-from-git.md`** - References "ralph loop claude" but the project has been renamed to "dust". Should be "dust loop claude".

2. **`use-claude-todo-tool.md`** - References "TaskCreate, TaskList, TaskUpdate, etc." but the actual Claude Code tool is called "TodoWrite". The tool names should be corrected.

3. **`explore-tool-terminology.md`** - References file paths like `lib/templates/agent-*.txt` and `lib/claude/spawn-claude-code.ts` that should be verified to ensure they still exist and are accurate.

## Process

For each idea file in `.dust/ideas/`:

1. Read the idea content
2. Check for outdated command names (e.g., "ralph" instead of "dust")
3. Verify any file paths mentioned still exist
4. Verify any tool names or API references are correct
5. Fix any inaccuracies found
6. Consider if the idea is still relevant or should be deleted

## Goals

- [Repository Hygiene](../goals/repository-hygiene.md)
- [Lightweight Planning](../goals/lightweight-planning.md)

## Blocked by

(none)

## Definition of done

- [ ] `decouple-loop-from-git.md` updated to use "dust" instead of "ralph"
- [ ] `use-claude-todo-tool.md` updated with correct Claude Code tool names
- [ ] `explore-tool-terminology.md` file paths verified and corrected if needed
- [ ] All other ideas reviewed for similar issues
- [ ] Any completely obsolete ideas deleted
