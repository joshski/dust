# Stale Idea Detection

Flag ideas that haven't been modified in a configurable number of commits.

Ideas can accumulate and become stale over time. Periodic prompts to review old ideas help keep the backlog healthy - either promote them to tasks, refine them, or delete them.

## Possible implementation

A `dust stale` command that:
- Uses git history to find ideas unchanged for N commits (default: 50?)
- Lists stale ideas for review
- Could also be integrated into `dust lint markdown` as a warning

This encourages regular pruning and prevents the ideas directory from becoming a graveyard.
