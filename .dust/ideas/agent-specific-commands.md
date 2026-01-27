# Agent-specific commands

When an agent starts up, they read AGENTS.md or CLAUDE.md

Instead of instructing the agent to run `dust help` we instruct the agent to run `dust agent`

This gives the agent a "drill down menu" designed specifically for agents, so it might respond like this:

```
Hello Claude, welcome to dust!

Your goal today is to make ONE SMALL CHANGE and then commit and push your changes.

I will help you to achieve that goal...

Depending on what the user has prompted, run the appropriate command:

* If the user has asked you to "work", then run `dust claude work`
* If the user mentions "task" or "tasks", then run `dust claude tasks`
* If the user mentions "goal" or "goals" then run `dust claude goals`
* If the user mentions "idea" or "ideas" then run `dust claude ideas`
* For any other prompt, run `dust claude help`
```

When the agent calls any of the agent-specific sub-commands, they are given further instructions that are specific to that sub-command.

This way we can streamline the experience of achieving different outcomes with a vague user prompt like "task: make the sign up button red" without exposing the complexities of the whole process to an agent that has been tasked with an unrelated deliverable.
