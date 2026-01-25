# Implement Prompt Script

Create a script that outputs prompts by name.

## Goals

- [Agent Agnostic](../goals/agent-agnostic.md)
- [Easy Adoption](../goals/easy-adoption.md)

## Blocked by

- [Implement Work Prompt](./implement-work-prompt.md)
- [Implement Validate Facts Prompt](./implement-validate-facts-prompt.md)

## Definition of done

A script exists that:
- Accepts a prompt name as argument (e.g. `work` or `validate-facts`)
- Reads the corresponding file from `prompts/` directory
- Outputs the contents to stdout
- Exits with error if prompt name not found
