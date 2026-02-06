# Improve Loop Task Found Message

Update the `dust loop claude` console output when tasks are found. Currently the "found tasks" and "starting Claude" messages are combined on one line. Split them for better readability and update the wording.

Current output:
```
✨ Found task(s). 🤖 Starting Claude...
🤖 Claude session started
```

Desired output:
```
✨ Found a task. Going to work!

🤖 Starting Claude...
🤖 Claude session started
```

The change is in `formatEvent` in `lib/cli/commands/loop.ts`:
- `loop.tasks_found` should return `'✨ Found a task. Going to work!\n'` (trailing newline for the blank line)
- `claude.started` should return `'🤖 Starting Claude...'` (was `'🤖 Claude session started'`)

The `claude.started` event now says "Starting Claude..." because the existing `claude.ended` event already reports the session outcome.

## Goals

- [Make Software Development Joyful](../goals/make-software-development-joyful.md)

## Blocked By

(none)

## Definition of Done

- [ ] `loop.tasks_found` event in `formatEvent` returns `'✨ Found a task. Going to work!\n'`
- [ ] `claude.started` event in `formatEvent` returns `'🤖 Starting Claude...'`
- [ ] Tests in `loop.test.ts` updated to match the new messages
- [ ] `bin/dust lint markdown` passes
