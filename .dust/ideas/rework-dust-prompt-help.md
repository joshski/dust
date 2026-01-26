# Rework dust prompt into dust help

The `dust prompt` command has poor ergonomics:

1. **Confusing name** - "prompt" suggests LLM system prompts, but these are workflow guides
2. **Hidden from discovery** - no `dust list prompts`, only shown in error messages
3. **Duplicates help content** - the Agent Guide in `dust help` covers similar ground
4. **Inconsistent mental model** - unlike tasks/ideas/goals/facts, prompts don't have a list command

## Proposed solution

Merge prompts into the help system using a familiar pattern (like `git help`, `npm help`):

- `dust help` - general help (unchanged)
- `dust help work` - workflow guide for working on tasks (replaces `dust prompt work`)
- `dust help idea-to-tasks` - workflow guide for converting ideas
- `dust help validate-facts` - workflow guide for fact validation

## Benefits

1. **Familiar pattern** - follows established CLI conventions
2. **Single documentation surface** - all guidance lives in `dust help`
3. **Natural discovery** - `dust help` can list available topics
4. **Better naming** - "help" conveys the purpose better than "prompt"
5. **Extensible** - easy to add more help topics without new commands

## Implementation sketch

1. Move `/prompts/*.md` content into the help system
2. Extend `dust help` to accept optional topic arguments
3. When no topic given, show general help with list of available topics
4. When topic given, show that specific workflow guide
5. Remove `dust prompt` command
6. Update CLAUDE.md references

## Alternative: Keep both

If backward compatibility matters, keep `dust prompt` as an alias but make `dust help <topic>` the primary documented interface.
