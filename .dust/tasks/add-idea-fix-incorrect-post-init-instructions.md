# Add Idea: Fix incorrect post-init instructions

Research this idea thoroughly, then create one or more idea files in `.dust/ideas/`. Read the codebase for relevant context, flesh out the description, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. If you add open questions, use `## Open Questions` with `### Question?` headings and one or more `#### Option` headings beneath each question, and only add questions that are meaningful decisions worth asking. Run `dust principles` and `dust facts` for relevant context.

## Idea Description

When running `bunx @joshski/dust init` I see instructions like this:

```
⚠️  Warning: CLAUDE.md already exists. Consider adding: "Always immediately run `bunx dust agent` when you start working in this repository."
📄 Created AGENTS.md with agent instructions

🚀 Next steps: Commit the changes if you are happy, then get planning!

If this is a new repository, you can start adding ideas or tasks right away:
   > bunx claude "Idea: friendly UI for non-technical users"
   > bunx codex "Task: set up code coverage"

If this is an existing codebase, you might want to backfill principles and facts:
   > bunx claude "Add principles and facts based on the code in this repository"
```

Those `bunx claude` and `bunx codex` should be `claude` and `codex` (no `bunx`)

## Task Type

capture

## Blocked By

(none)


## Definition of Done

- One or more idea files are created in `.dust/ideas/`
- Each idea file has an H1 title matching its content
- Idea includes relevant context from codebase exploration
- Open questions are added for any ambiguous or underspecified aspects
- Open questions follow the required heading format and focus on high-value decisions
