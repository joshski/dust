# Improve loop task found message

Improve the visual formatting of the task found message in the loop command.

When `dust loop claude` finds a task, the output currently looks like this:

```
✨ Found task(s). 🤖 Starting Claude...
```

It should look like this:

```
✨ Found a task!

🤖 Starting Claude...
```

## Implementation

In `lib/cli/commands/loop.ts` at line 108, change:

```typescript
context.stdout('✨ Found task(s). 🤖 Starting Claude...')
```

To:

```typescript
context.stdout('✨ Found a task!')
context.stdout('')
context.stdout('🤖 Starting Claude...')
```

## Goals

- [Make Software Development Joyful](../goals/make-software-development-joyful.md)

## Blocked by

(none)

## Definition of done

- [ ] The message when a task is found displays on separate lines with a blank line between them
- [ ] The message uses singular "a task" instead of "task(s)"
