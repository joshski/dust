# Improve agent greeting

Update the agent greeting template to be clearer about how to respond to natural language prompts.

## Current behavior

The current greeting uses a simple keyword-matching approach that doesn't handle natural language well.

## Proposed changes

Replace the content of `lib/templates/agent-greeting.txt` with clearer guidance:

```
Hello Claude, welcome to dust!

Your goal today is to make ONE SMALL CHANGE and then commit and push your changes.

The user might be prompting you to do one of many things. Depending on their intention, run
one of the following commands:

If your prompt is something like one of these:

    * "work"
    * "get to work"
    * "go"
    * "pick a task"

...then run:

`{{bin}} agent work`

If your prompt is something like one of these:

    * "add a task ..."
    * "task: ..."

...then you should create a new task. To find out how, you should immediately run:

`{{bin}} agent tasks`

If your prompt is something like one of these:

    * "add a goal ..."
    * "goal: ..."

...then you should create a new goal. To find out how, you should immediately run:

`{{bin}} agent goals`

If it sounds like the prompt is a vague idea about some potential change to the system,
then you should create an idea. To find out how, you should immediately run:

`{{bin}} agent ideas`

If it's still not clear, run:

`{{bin}} agent help`
```

## Goals

- [Easy Adoption](../goals/easy-adoption.md)

## Blocked by

(none)

## Definition of done

- [ ] `lib/templates/agent-greeting.txt` updated with new content
- [ ] Template provides clearer natural language examples
- [ ] `bin/dust check` passes
