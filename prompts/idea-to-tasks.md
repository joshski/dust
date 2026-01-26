# Idea to Tasks

Transform an idea from the ideas queue into one or more actionable tasks.

## Instructions

1. **Select an idea** from `.dust/ideas/`:
   - If a specific idea was requested, use that one
   - Otherwise, review available ideas and select one based on your judgment
   - Consider ideas that align with current goals or unblock other work

2. **Understand the idea**:
   - Read the idea file thoroughly
   - Review any goals it references or relates to
   - Check existing tasks to understand current work in progress
   - Consider what concrete implementation would satisfy the idea

3. **Break the idea into tasks**:
   - Each task should be a small, discrete unit of work completable in a single commit
   - Tasks should have clear boundaries and testable outcomes
   - If the idea is simple, it may become a single task
   - If the idea is complex, create multiple tasks with appropriate dependencies

4. **Create task files** in `.dust/tasks/` following the [Task File Format](../.dust/facts/task-file-format.md):
   - Use slug-style filenames (lowercase, hyphens, no spaces)
   - Include all three required sections:
     - `## Goals` - Link to goals this task supports
     - `## Blocked by` - Link to tasks that must complete first, or "(none)"
     - `## Definition of done` - Clear, testable criteria for completion

5. **Establish dependencies**:
   - If tasks must be completed in sequence, use `## Blocked by` to link them
   - Reference blocking tasks with relative links: `[Task Name](task-filename.md)`
   - Tasks with no dependencies should have `(none)` in their `## Blocked by` section

6. **Write clear definitions of done**:
   - Be specific about what files, features, or behaviors should exist
   - Include testable acceptance criteria
   - Describe the expected end state, not the process

7. **Make an atomic commit** containing:
   - All new task files
   - Deletion of the original idea file
   - The commit message should describe what idea was converted and how many tasks were created

## Example

An idea like "Add input validation" might become:

- `validate-user-input.md` - blocked by (none)
- `add-validation-error-messages.md` - blocked by `validate-user-input.md`
- `document-validation-rules.md` - blocked by `add-validation-error-messages.md`

## Next Steps

After converting ideas to tasks, the [work](work.md) prompt can be used to select and implement unblocked tasks from the queue.
