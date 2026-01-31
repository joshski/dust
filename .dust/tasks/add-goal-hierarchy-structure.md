# Add Goal Hierarchy Structure

Add "Parent Goal" and "Sub-Goals" sections to all goal files to establish a hierarchical relationship between goals.

Goals should be organized in a tree structure where each goal (except top-level goals) has exactly one parent, and goals can have zero or more sub-goals. This structure enables better understanding of how specific goals relate to broader objectives.

## Implementation Details

Each goal file should have two new H2 sections at the bottom:

1. **Parent Goal** - A bullet point with a markdown link to the parent goal file, or `(none)` for top-level goals
2. **Sub-Goals** - Bullet points with markdown links to child goal files, or `(none)` if the goal has no sub-goals

Links should use relative paths from the goals directory (e.g., `../goals/goal-name.md`).

### Steps

1. Analyze existing goals to determine a logical hierarchy
2. Create any necessary top-level goals that serve as parents for existing goals
3. Add "Parent Goal" and "Sub-Goals" sections to all goal files
4. Ensure bidirectional links are consistent (if A lists B as parent, B must list A as sub-goal)

## Goals

- [Organized Concerns](../goals/organized-concerns.md)
- [Lightweight Planning](../goals/lightweight-planning.md)

## Blocked by

(none)

## Definition of done

- [ ] All goal files have "Parent Goal" and "Sub-Goals" sections
- [ ] Bidirectional links are consistent between parent and sub-goals
- [ ] Top-level goals exist to serve as parents for related goals
- [ ] The goal hierarchy forms a valid tree structure (no cycles, single parent per goal)
