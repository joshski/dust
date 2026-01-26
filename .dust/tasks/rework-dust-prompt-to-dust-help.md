# Rework dust prompt into dust help

Replace the `dust prompt` command with `dust help <topic>` for better discoverability and familiar CLI conventions.

## Goals

- [Progressive Disclosure](../goals/progressive-disclosure.md)
- [Easy Adoption](../goals/easy-adoption.md)

## Blocked by

(none)

## Definition of done

- [ ] `dust help` shows general help with a list of available topics
- [ ] `dust help work` shows workflow guide for working on tasks (content from current `dust prompt work`)
- [ ] `dust help idea-to-tasks` shows workflow guide for converting ideas
- [ ] `dust help validate-facts` shows workflow guide for fact validation
- [ ] `dust prompt` command is removed
- [ ] References to `dust prompt` in documentation are updated
- [ ] `bin/dust validate` passes
