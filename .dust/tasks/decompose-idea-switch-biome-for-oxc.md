# Decompose Idea: Switch Biome for OXC

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Run `dust principles` to link relevant principles and `dust facts` for design decisions that should inform the task. See [Switch Biome for OXC](../ideas/switch-biome-for-oxc.md).

Really think about "Functional Core, Imperative Shell"

Run `oxlint` and `oxfmt` as separate checks.

## Resolved Questions

### How should we preserve Biome custom GritQL rules if we switch lint engines?

**Decision:** Option 2: Port custom rule intent to another system and fully remove Biome

### What level of lint rule parity is required?

**Decision:** Option 2: Embrace OXC defaults immediately

### How should formatting parity be defined for `package.json` key ordering differences?

**Decision:** Option 1: Preserve current Biome output exactly (recommended)

### Should `.dust/` markdown formatting be in scope for this migration?

**Decision:** Option 1: No, keep scope to code/config formatting only (recommended)


## Decomposes Idea

- [Switch Biome for OXC](../ideas/switch-biome-for-oxc.md)

## Blocked By

(none)

## Definition of Done

- [ ] One or more new tasks are created in .dust/tasks/
- [ ] Task's Principles section links to relevant principles from .dust/principles/
- [ ] The original idea is deleted or updated to reflect remaining scope
