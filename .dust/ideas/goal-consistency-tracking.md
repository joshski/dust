# Principle Consistency Tracking

Mechanisms to ensure that principles remain relevant and that work actually aligns with stated principles over time.

Currently, principles are static documents that tasks reference. There's no validation that work truly supports those principles, or that all principles receive attention.

## Possible approaches

### Principle health checks
Detect "neglected" principles - principles that haven't been referenced by recent tasks. A principle no one works toward may indicate drift from stated principles.

### Principle coverage reports
A `dust principles report` command that shows:
- Which principles have active tasks
- Which principles haven't been referenced recently
- Distribution of task-to-principle references

### Principle anti-patterns
Each principle could optionally define what violates it. For example, `small-units` could specify "tasks with more than 3 bullet points in definition of done" as a warning sign. Validation could check for these patterns.

### Commit-principle alignment
When a task is completed, optionally verify the commit reflects the stated principles. A task claiming `atomic-commits` but pushing partial work could be flagged.

### Periodic review ritual
A `dust review principles` command that prompts reflection: "Is this principle still relevant? Are we living by it?" Could be triggered after N completed tasks.

### Principle drift detection
Use agent review to check whether completed task outcomes actually match their stated principles. This would require reading the diff and the principle content.

## Open Questions

### How much automation vs. manual review?

#### Mostly automated

Run checks automatically on every task completion, with human override for false positives.

#### Mostly manual

Rely on periodic review commands that prompt human reflection, with automation only for data gathering.

### Should principle violations block commits or just warn?

#### Block commits

Enforce strict alignment so drift is impossible, similar to how lint errors block pushes.

#### Just warn

Advisory-only mode that surfaces issues without blocking workflow, letting teams decide when to act.

### How to measure principle adherence without creating bureaucracy?

#### Lightweight heuristics

Use simple proxy metrics like task-to-principle reference counts and recency, avoiding detailed manual assessment.

#### Structured review

Periodic structured reviews with specific prompts, accepting some overhead for more accurate measurement.
