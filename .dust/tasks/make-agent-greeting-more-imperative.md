# Make agent greeting more imperative

The agent greeting in `lib/templates/agent-greeting.txt` acts as a command dispatcher, telling agents which subcommand to run based on the user's request. However, agents sometimes ignore the instructions and proceed without running the appropriate command.

Changes needed:
1. Remove the line "Your goal is to make ONE SMALL CHANGE and then commit and push."
2. Make the dispatch instructions more imperative so agents are compelled to run a command

Example of more imperative language:
- "CRITICAL: You MUST run exactly one of these commands now"
- "Do NOT proceed without running a command"

## Goals

- [Agent Autonomy](../goals/agent-autonomy.md)

## Blocked by

(none)

## Definition of done

- [ ] The "Your goal..." line is removed from the greeting
- [ ] The greeting uses stronger, more imperative language to ensure agents run a subcommand
- [ ] Tested manually by starting a new agent session with a task prompt
