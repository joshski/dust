# Idea priority

Add a priority level (low, medium, high) to each idea as an optional markdown element.

Currently, `dust ideas` lists ideas in alphabetical order by filename. When selecting which idea to refine or decompose, there is no guidance about relative importance. A priority field would let idea authors signal which ideas matter most, and the listing/picking flow could present high-priority ideas first.

## Context

The existing [Task priority](task-priority.md) idea proposes adding priority to tasks with a mandatory `## Priority` section. This idea extends the same concept to ideas, with some key differences:

1. **Ideas are less structured than tasks** - Tasks have required sections (`## Principles`, `## Blocked By`, `## Definition of Done`), while ideas are more freeform. Adding mandatory priority would be a significant constraint on idea authoring.

2. **Ideas compete for refinement** - When an agent or human decides what to work on, they may choose between refining multiple ideas. Priority helps surface which ideas deserve attention first.

3. **Idea volume can be high** - Repositories may accumulate many ideas over time. Priority provides a way to triage without deleting potentially valuable ideas.

## How it could work

A new optional section `## Priority` would be added to idea files. The section body would contain exactly one of: `high`, `medium`, or `low`.

Example:

```markdown
## Priority

high
```

The lint system (`lint-markdown.ts`) would validate:
- If the section exists, the value is one of the three allowed levels
- No extra content in the section

The `dust ideas` command currently lists ideas alphabetically. With priority, it could:
- Sort high before medium before low, preserving alphabetical order within each tier
- Optionally annotate each idea with its priority level in the output

The idea picker (if one exists or is added) could present high-priority ideas first.

## Relationship to Task Priority

Ideas and tasks form a pipeline: ideas are refined and decomposed into tasks. The question of whether priority should carry through this pipeline is relevant:

- **Independent priority**: Ideas have their own priority, tasks have their own. When an idea is decomposed, the author chooses task priorities independently. This is simpler and more flexible.

- **Inherited priority**: Tasks spawned from a high-priority idea default to high priority. This ensures important ideas become important tasks, but may not reflect the actual urgency of individual tasks.

The existing [Task priority](task-priority.md) idea does not address this relationship, suggesting independent priority is the implicit assumption.

## Open Questions

### Should idea priority be required or optional?

#### Optional with implicit default (Recommended)

Ideas without a `## Priority` section are treated as medium priority. This reduces friction for casual idea capture—when jotting down a quick thought, authors shouldn't need to decide priority. The default can be "medium" so that explicit low and high priorities stand out.

Pros: Low friction, backwards compatible with existing ideas
Cons: Implicit defaults may cause confusion

#### Required in all idea files

Every idea must declare a priority. This ensures the priority system is always complete. However, ideas are meant to be lightweight—forcing a priority decision on every idea adds friction to brainstorming.

Pros: Complete data, no ambiguity
Cons: Higher friction, requires updating existing ideas

### Should priority affect idea selection order, or just display?

#### Affect display order only (Recommended)

`dust ideas` sorts ideas by priority (high → medium → low), then alphabetically within each tier. The human or agent sees high-priority ideas at the top and is likely to pick them, but retains full discretion.

Pros: Nudges toward important ideas without forcing, preserves flexibility
Cons: Doesn't guarantee high-priority ideas get attention

#### Affect selection (only show highest priority)

Only show ideas at the highest available priority level. If any high-priority ideas exist, medium and low ideas are hidden.

Pros: Guarantees important ideas are addressed first
Cons: Removes agent discretion, can starve lower-priority ideas indefinitely

### How should priority interact with workflow tasks?

#### Priority informs workflow task creation

When creating a refine-idea or decompose-idea task for a high-priority idea, the generated task could inherit that priority (or be set to high by default). This connects idea priority to task priority.

Pros: Maintains urgency through the pipeline, high-priority ideas become high-priority work
Cons: Increases coupling between ideas and tasks, may not reflect actual task urgency

#### Priority stays with ideas only

Idea priority affects idea listing and selection. Once an idea becomes a task, task priority is determined independently based on the task's own characteristics.

Pros: Clean separation of concerns, task priority reflects task urgency
Cons: A high-priority idea could spawn medium-priority tasks, losing urgency signal
