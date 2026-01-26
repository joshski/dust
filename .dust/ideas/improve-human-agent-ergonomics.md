# Improve human/agent ergonomics

Over time, humans come up with ideas. Although these are intentionally left vague, it still helps to have an agent explore the repository to help frame the idea in context.

Supposing we have a static prompt (at say `./prompts/add-idea.md`) - we could then refer to that prompt by name when we want to have an agent "flesh out" an idea based on terse input.

For example, `echo "add the idea 'delete widget' (see ./prompts/add-idea.md)" | claude`

However this is still pretty cumbersome to type. With this in mind, perhaps we need to hint towards this explicitly in CLAUDE.md or AGENTS.md -- letting agents know where to look when a user says "add the idea '...'"

However CLAUDE.md and AGENTS.md are project-defined - so it's not clear how we would a) bootstrap this to begin with and b) keep it updated as dust itself changes.

Perhaps with this in mind we should avoid polluting CLAUDE.md and AGENTS.md with any dust-related details (that will eventually go stale) and instead point agents at a single command to discover how to interact with dust, e.g.

```
This project uses [dust](https://github.com/joshski/dust) for planning and documentation - run `dust help` to get started.
```
