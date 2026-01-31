# Add Task Identification Step

Add a step in the instructions for "agent implement task" that tells the agent to run `dust next` first to identify which task the user is referring to.

## Background

When the user says "implement the foo task", the agent is prompted to run "dust agent implement task" - but they don't know where to find the "foo" task. The instructions should guide the agent to identify the task first.

## Implementation Details

Update `lib/templates/agent-implement-task.txt` to add a new step 1: "Run `dust next` to identify the (unblocked) task the user is referring to". Renumber all subsequent steps accordingly.

## Blocked by

(none)

## Definition of done

- [ ] Step 1 instructs agent to run `dust next`
- [ ] All subsequent steps are correctly renumbered
- [ ] Tests are updated to reflect new step numbers
