# Remove misleading dependency examples from task instructions

The task implementation workflow in `lib/templates/agent-tasks.txt` includes examples like `npm install` and `bundle install` that can mislead agents into running unnecessary commands.

The instruction "Install dependencies first (e.g., `npm install`, `bundle install`)" caused an agent to run `npm install` even though dependencies were already installed and `dust check` was working fine.

The instruction should focus on ensuring the project is in a working state, not prescribe specific commands that may not be relevant.

## Goals

- [Fast Feedback](../goals/fast-feedback.md)
- [Clarity over Brevity](../goals/clarity-over-brevity.md)

## Blocked by

(none)

## Definition of done

- [ ] Remove or reword the misleading dependency installation examples in `lib/templates/agent-tasks.txt`
- [ ] The instruction should emphasize running `bin/dust check` first rather than specific install commands
- [ ] All tests pass
