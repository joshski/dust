# Add Goal Hierarchy Validation

Extend `dust lint markdown` to validate the goal hierarchy structure and bidirectional links between parent and sub-goals.

Once goal files have "Parent Goal" and "Sub-Goals" sections, the lint command should verify that:

1. All goal files have both required sections
2. Links in these sections point to valid goal files
3. Bidirectional links are consistent (if goal A lists B as parent, B must list A as a sub-goal)
4. The hierarchy forms a valid tree (no cycles, single parent per goal except top-level goals)

## Implementation Details

Add new validation functions to `lib/cli/commands/lint-markdown.ts`:

- `validateGoalHierarchySections`: Check that "Parent Goal" and "Sub-Goals" sections exist in all goal files
- `validateGoalHierarchyLinks`: Ensure links point to goal files
- `validateBidirectionalLinks`: Cross-check parent/sub-goal relationships across all goal files
- `validateNoCycles`: Detect circular parent relationships

The validation should produce clear error messages when:

- A goal is missing required sections
- A parent link doesn't have a corresponding sub-goal link in the target
- A sub-goal link doesn't have a corresponding parent link in the target
- A cycle is detected in the hierarchy

## Goals

- [Make Changes with Confidence](../goals/make-changes-with-confidence.md)
- [Repository Hygiene](../goals/repository-hygiene.md)

## Blocked by

(none)

## Definition of done

- [ ] `dust lint markdown` validates presence of "Parent Goal" and "Sub-Goals" sections in goal files
- [ ] Lint validates that links in hierarchy sections point to goal files
- [ ] Lint validates bidirectional consistency between parent and sub-goal links
- [ ] Lint detects and reports cycles in the goal hierarchy
- [ ] Tests cover all validation scenarios
