# Rename goals to principles everywhere

Rename Dust's "goals" concept to "principles" across the entire codebase.

Update CLI commands, directory names, markdown schemas, lint rules, tests, prompts, generated text, and documentation so no user-facing or internal references to "goal" or "goals" remain.

This task should migrate `.dust/goals/` to `.dust/principles/`, replace all `goal(s)` command names and references with `principle(s)`, and update task markdown requirements currently using `## Goals` to a principle-aligned section name. Preserve behavior and compatibility where needed by adding an explicit migration strategy (for existing repositories and existing task/idea/goal files), then remove legacy naming once tests and lint rules are updated to the new terminology.

## Goals

- [Consistent Naming](../goals/consistent-naming.md)
- [Intuitive Directory Structure](../goals/intuitive-directory-structure.md)

## Blocked By

(none)

## Definition of Done

- [ ] `.dust/goals/` is replaced by `.dust/principles/` in repository structure, initialization, and runtime lookup code.
- [ ] CLI command surface uses `principle/principles` terminology (including help text and routing) with no remaining `goal/goals` command names.
- [ ] Markdown lint validators and required section names are updated from goal terminology to principle terminology.
- [ ] All tests are updated and passing with principle terminology only (unit tests and system tests affected by the rename).
- [ ] Project documentation and agent instructions are updated so they reference principles, not goals.
- [ ] A repository migration path is implemented and documented so existing `.dust/goals/` content is migrated safely.
- [ ] A repository-wide search confirms no remaining instances of `goal` or `goals` outside intentionally retained migration shims (if any), and any temporary shims are documented with removal criteria.
