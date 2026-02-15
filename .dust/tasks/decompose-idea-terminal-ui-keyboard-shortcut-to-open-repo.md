# Decompose Idea: Terminal UI keyboard shortcut to open repo

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Review `.dust/goals/` to link relevant goals and `.dust/facts/` for design decisions that should inform the task. See [Terminal UI keyboard shortcut to open repo](../ideas/terminal-ui-keyboard-shortcut-to-open-repo.md).

## Resolved Questions

### How should the repository URL reach the keyboard handler?

**Decision:** Add a URL map to TerminalUIState

### What should happen when no URL is available?

**Decision:** Silently ignore the keypress

### What should `o` do when the "All" tab is selected?

**Decision:** Ignore the keypress in "All" view

### Should the URL field be required or optional?

**Decision:** Optional (`url?: string`)

### Should there be user feedback after pressing `o`?

**Decision:** No feedback — just open the browser


## Goals

(none)

## Blocked By

(none)

## Definition of Done

- [ ] One or more new tasks are created in .dust/tasks/
- [ ] Task's Goals section links to relevant goals from .dust/goals/
- [ ] The original idea is deleted or updated to reflect remaining scope
