# Add push instructions to templates

The agent instruction templates currently tell the agent to create commits but don't instruct them to push those commits to the remote repository.

Update the following templates in `lib/templates/` to include a push step after committing:

- `agent-new-task.txt` - Add step to push after creating the task commit
- `agent-new-goal.txt` - Add step to push after creating the goal commit
- `agent-new-idea.txt` - Add step to push after creating the idea commit
- `agent-implement-task.txt` - Add step to push after creating the implementation commit

The push instruction should be simple and direct, e.g., "Push your commit to the remote repository."

## Goals

(none)

## Blocked by

(none)

## Definition of done

- [ ] `agent-new-task.txt` includes push instruction after commit step
- [ ] `agent-new-goal.txt` includes push instruction after commit step
- [ ] `agent-new-idea.txt` includes push instruction after commit step
- [ ] `agent-implement-task.txt` includes push instruction after commit step
