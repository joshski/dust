# Add Idea: Only run `dust validate markdown` for workflow tasks

Research this idea thoroughly, then create an idea file at `.dust/ideas/only-run-dust-validate-markdown-for-workflow-tasks.md`. Read the codebase for relevant context, flesh out the description, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. Review `.dust/goals/` and `.dust/facts/` for relevant context. The idea should have the title "Only run `dust validate markdown` for workflow tasks" and start from the following description:

When an agent begins working on a "workflow task" they should be instructed only to run `dust lint markdown` in place of `dust check`, and not edit any files outside of ./.dust/ in that commit (when they announce their focus). The git push hook should only lint markdown when it's a workflow task. Workflow tasks can be detected already

## Goals

(none)

## Blocked By

(none)

## Definition of Done

- [ ] Idea file exists at .dust/ideas/only-run-dust-validate-markdown-for-workflow-tasks.md
- [ ] Idea file has an H1 title matching "Only run `dust validate markdown` for workflow tasks"
- [ ] Idea includes relevant context from codebase exploration
- [ ] Open questions are added for any ambiguous or underspecified aspects
