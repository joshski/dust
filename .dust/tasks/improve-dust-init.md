# Improve dust init command

Make `dust init` more user-friendly and set up CLAUDE.md/AGENTS.md files for agent integration.

## Problem

Currently `dust init` fails with an error when the `.dust` directory already exists. This is unfriendly - users may want to re-run init to add missing files or update configuration. Additionally, `dust init` doesn't create the CLAUDE.md or AGENTS.md files that tell coding agents to run `dust agent`.

## Proposed behavior

1. **When .dust directory exists**: Show a notification (not an error) like "Note: .dust directory already exists, skipping creation"
2. **Create CLAUDE.md**: Write a CLAUDE.md file based on a template with instructions to run `dust agent`
3. **Create AGENTS.md**: Write an AGENTS.md file based on a template with instructions to run `dust agent`
4. **When CLAUDE.md/AGENTS.md already exist**: Show a warning and suggest the user add the agent welcome instructions manually

## Goals

- [Easy Adoption](../goals/easy-adoption.md)
- [Human-AI Collaboration](../goals/human-ai-collaboration.md)

## Blocked by

(none)

## Definition of done

- [ ] `dust init` shows a notification (not error) when .dust directory already exists
- [ ] `dust init` creates CLAUDE.md with agent welcome instructions
- [ ] `dust init` creates AGENTS.md with agent welcome instructions
- [ ] When CLAUDE.md already exists, shows warning suggesting manual addition of instructions
- [ ] When AGENTS.md already exists, shows warning suggesting manual addition of instructions
- [ ] Templates for CLAUDE.md and AGENTS.md exist in lib/templates/
- [ ] Tests cover all scenarios
- [ ] `bin/dust check` passes
