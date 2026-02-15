# Decompose Idea: Bypass dust agent in loop and bucket

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks -- split the idea into multiple tasks if it covers more than one logical change. Review `.dust/goals/` to link relevant goals and `.dust/facts/` for design decisions that should inform the task. See [Bypass dust agent in loop and bucket](../ideas/bypass-dust-agent-in-loop-and-bucket.md).

The prompt should explicitly mention that it is listing the contents of the task file in question, and in the deletion instructions it can refer to the specific file that needs to be deleted.

I think we should also emit an event which includes the exact prompt that we launched claude with (loop.start_agent or something)

## Resolved Questions

### Should this change apply only to loop/bucket, or also to interactive use?

**Decision:** Loop/bucket only

### How should error handling work when no tasks are available?

**Decision:** Return early with an event

### Should the prompt include the raw task file or a processed version?

**Decision:** Raw task file content

### What happens if the task is blocked?

**Decision:** Caller ensures task is unblocked before passing


## Goals

(none)

## Blocked By

(none)

## Definition of Done

- [ ] One or more new tasks are created in .dust/tasks/
- [ ] Task's Goals section links to relevant goals from .dust/goals/
- [ ] The original idea is deleted or updated to reflect remaining scope
