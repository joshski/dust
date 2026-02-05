# Add Stale Idea Detection

Flag ideas that haven't been modified in a configurable number of commits, encouraging regular pruning of the ideas backlog.

## Goals

- [Repository Hygiene](../goals/repository-hygiene.md)
- [Lightweight Planning](../goals/lightweight-planning.md)
- [Agent Autonomy](../goals/agent-autonomy.md)

## Blocked By

(none)

## Definition of Done

- [ ] A `dust stale` command exists that lists ideas unchanged for N commits (default: 50)
- [ ] The commit threshold is configurable via `.dust/config/settings.json`
- [ ] Output tells the agent what to do (review, promote, or delete each stale idea)
- [ ] Unit tests cover the stale detection logic
- [ ] The idea file `.dust/ideas/stale-idea-detection.md` is deleted in the implementing commit
