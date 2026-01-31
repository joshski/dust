# Remove "list" from commands

Commands that show goals/ideas/tasks/facts should use shorter syntax.

## Current behavior
- `dust list tasks` shows tasks
- `dust list goals` shows goals
- `dust list ideas` shows ideas
- `dust list facts` shows facts

## Desired behavior
- `dust tasks` shows tasks
- `dust goals` shows goals
- `dust ideas` shows ideas
- `dust facts` shows facts

## Implementation
- Create wrapper commands that delegate to the list command with the appropriate type
- Register new commands in the command registry
- Update help text to show new command names

## Definition of done
- [ ] `dust tasks` shows tasks
- [ ] `dust goals` shows goals
- [ ] `dust ideas` shows ideas
- [ ] `dust facts` shows facts
- [ ] Help text updated
- [ ] Tests pass
