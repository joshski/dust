# Remove hooks directory references

The `.dust/hooks/` directory concept was removed from the project, but there are still references to it in the codebase that should be cleaned up.

## References to remove

- `README.md:78` - Remove the section about configuring hooks in `.dust/config/settings.json`
- `lib/templates/agent-help.txt:9` - Remove the line mentioning `hooks/` in the directory structure

## Goals

- [Repository Hygiene](../goals/repository-hygiene.md)

## Blocked by

(none)

## Definition of done

- [ ] All references to `.dust/hooks/` are removed from documentation and templates
- [ ] `bin/dust validate` passes
