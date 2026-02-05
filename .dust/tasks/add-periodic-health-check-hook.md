# Add Periodic Health Check Hook

Trigger periodic dust health checks based on commits since last review, prompting agents to create a review task when maintenance is due.

## Goals

- [Repository Hygiene](../goals/repository-hygiene.md)
- [Agent Autonomy](../goals/agent-autonomy.md)
- [Actionable Errors](../goals/actionable-errors.md)

## Blocked By

(none)

## Definition of Done

- [ ] A health check runs automatically during `dust agent` or `dust next` when a `.git` directory exists
- [ ] The check counts commits since the last deletion of `.dust/tasks/dust-review.md` in git history
- [ ] When the threshold (default: 50 commits) is exceeded, a prescriptive message tells the agent to create a review task
- [ ] The threshold is configurable via `.dust/config/settings.json`
- [ ] Unit tests cover the commit-counting and threshold logic
- [ ] The idea file `.dust/ideas/periodic-health-check-hook.md` is deleted in the implementing commit
