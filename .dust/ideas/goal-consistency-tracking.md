# Goal Consistency Tracking

Mechanisms to ensure that goals remain relevant and that work actually aligns with stated goals over time.

Currently, goals are static documents that tasks reference. There's no validation that work truly supports those goals, or that all goals receive attention.

## Possible approaches

### Goal health checks
Detect "neglected" goals - goals that haven't been referenced by recent tasks. A goal no one works toward may indicate drift from stated principles.

### Goal coverage reports
A `dust goals report` command that shows:
- Which goals have active tasks
- Which goals haven't been referenced recently
- Distribution of task-to-goal references

### Goal anti-patterns
Each goal could optionally define what violates it. For example, `small-units` could specify "tasks with more than 3 bullet points in definition of done" as a warning sign. Validation could check for these patterns.

### Commit-goal alignment
When a task is completed, optionally verify the commit reflects the stated goals. A task claiming `atomic-commits` but pushing partial work could be flagged.

### Periodic review ritual
A `dust review goals` command that prompts reflection: "Is this goal still relevant? Are we living by it?" Could be triggered after N completed tasks.

### Goal drift detection
Use agent review to check whether completed task outcomes actually match their stated goals. This would require reading the diff and the goal content.

## Open questions

- How much automation vs. manual review?
- Should goal violations block commits or just warn?
- How to measure goal adherence without creating bureaucracy?
