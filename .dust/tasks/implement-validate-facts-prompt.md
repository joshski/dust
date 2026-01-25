# Implement Validate Facts Prompt

Create a prompt that validates Dust facts match implementation.

## Goals

- [Agent Agnostic](../goals/agent-agnostic.md)
- [Repository Hygiene](../goals/repository-hygiene.md)

## Blocked by

(none)

## Definition of done

A markdown file exists at `prompts/validate-facts.md` that instructs an AI agent to:
- Compare documented facts in `.dust/facts/` against actual implementation
- Identify any discrepancies or outdated information
- Suggest updates to bring facts in sync with code
