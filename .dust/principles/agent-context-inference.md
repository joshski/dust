# Agent Context Inference

Terse human prompts should trigger the correct agent action.

When a human gives a brief instruction like "the button should be green", the agent should be able to infer what to do. The agent shouldn't require the human to specify file paths, component names, or implementation details that can be discovered from the repository.

This reduces friction for humans and makes agent interactions feel more natural. The burden of context discovery shifts to the agent, which can use dust's CLI and repository structure to find what it needs.

## Applicability

Internal

## Parent Principle

- [Agent Autonomy](agent-autonomy.md)

## Sub-Principles

- (none)
