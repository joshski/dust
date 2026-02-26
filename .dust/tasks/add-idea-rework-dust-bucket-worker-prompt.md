# Add Idea: Rework dust bucket worker prompt

Research this idea thoroughly, then create one or more idea files in `.dust/ideas/`. Read the codebase for relevant context, flesh out the description, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. If you add open questions, use `## Open Questions` with `### Question?` headings and one or more `#### Option` headings beneath each question, and only add questions that are meaningful decisions worth asking. Run `dust principles` and `dust facts` for relevant context.

## Idea Description

Here is what the prompt looks like for starting an iteration of `dust bucket worker` or `dust loop`:

==========================================
Run `bun install` to install dependencies, then implement the following task.

The following is the contents of the task file `.dust/tasks/some-idea.md`:

----------
# Some Idea

...

----------

When the task is complete, delete the task file `.dust/tasks/some-idea.md`.

## Instructions

Note: Do NOT run `bunx dust agent`.

1. Run `bunx dust check` to verify the project is in a good state
2. Implement the task
3. Create a single atomic commit that includes:
   - All implementation changes
   - Deletion of the completed task file
   - Updates to any facts that changed
   - Deletion of the idea file that spawned this task (if remaining scope exists, create new ideas for it)

   Use this exact commit message: "Some Idea". Do not add any prefix.

4. Push your commit to the remote repository

Keep your change small and focused. One task, one commit.
==========================================

...but I want this too look more like:

==========================================
Implement the task at `.dust/tasks/some-idea.md`:

----------
# Some Idea

...

----------

## How to implement the task

Note: Do NOT run `bunx dust agent`.

1. Run `bun install` to install dependencies
2. Run `bunx dust check` to verify the project is in a good state
3. Make changes to the repository as per the task file
4. Create a single atomic commit that:
   - Includes all implementation changes
   - Deletes the completed task file (`.dust/tasks/some-idea.md`)
   - Updates any facts under that changed (Run `bunx dust facts` to see which ones may be affacted)
   - Uses the exact commit message "Some Idea". Do not add any prefix.
5. Push your commit to the remote repository

Keep your change small and focused. One task, one commit.
==========================================

## Blocked By

(none)

## Definition of Done

- [ ] One or more idea files are created in `.dust/ideas/`
- [ ] Each idea file has an H1 title matching its content
- [ ] Idea includes relevant context from codebase exploration
- [ ] Open questions are added for any ambiguous or underspecified aspects
- [ ] Open questions follow the required heading format and focus on high-value decisions
