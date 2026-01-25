# Work

Select and implement a task from the Dust task queue.

## Instructions

1. **Review available tasks** in `.dust/tasks/`:
   - Read each task file to understand its requirements
   - Note the `## Blocked by` section of each task

2. **Check dependencies** for each task:
   - A task is blocked if any file in its `## Blocked by` section still exists
   - A task is unblocked if its `## Blocked by` section is empty or contains "(none)"
   - A task is also unblocked if all files in its `## Blocked by` section have been deleted

3. **Select an unblocked task** to work on:
   - If multiple tasks are unblocked, choose one based on your judgment
   - If no tasks are unblocked, report this and stop

4. **Spawn a sub-agent** with fresh context to implement the selected task:
   - Pass the full content of the task file to the sub-agent
   - The sub-agent should work with a clean context, not inheriting this conversation's history
   - This ensures focused implementation without context pollution

5. **Sub-agent responsibilities**:
   - Implement the task according to its `## Definition of done`
   - Create an atomic commit that includes:
     - All implementation changes
     - Deletion of the completed task file
     - Updates to any facts that have changed as a result of the work
     - Deletion of any ideas that have been fully realized
   - The commit message should describe what was implemented

## Important Notes

- Tasks should be small units of work completable in a single commit
- If a task is too large, the sub-agent should split it into smaller tasks
- Each commit should leave the system in a working state
- Facts must be updated to reflect any new realities created by the implementation
- Links between documents should remain valid after changes
