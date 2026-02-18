# Validate Open Questions format strictly

Tighten Open Questions linting so malformed sections are rejected deterministically.

Update idea markdown validation to reject non-canonical `## Open Questions` content that currently slips through lint. In particular, numbered list items (for example, `1. ...`) and other top-level content inside the section should fail validation unless they are part of the heading-based structure (`###` question headings ending with `?`, followed by one or more `####` option headings). Keep compatibility for markdown content nested under options, including lists and fenced code blocks.

Also improve agent guidance where tasks instruct agents to add open questions. The generated task text in `lib/workflow-tasks.ts` currently says to "add open questions" but does not restate the required structure, which makes malformed output more likely. Add a concise format hint there so agents are reminded of the expected `###`/`####` structure when creating or refining ideas.

## Goals

- [Lint Everything](../goals/lint-everything.md)
- [Agent Autonomy](../goals/agent-autonomy.md)
- [Actionable Errors](../goals/actionable-errors.md)

## Blocked By

(none)

## Definition of Done

- [ ] `validateIdeaOpenQuestions` rejects ordered-list items in `## Open Questions` (for example `1. Question`).
- [ ] `validateIdeaOpenQuestions` rejects non-empty top-level lines in `## Open Questions` that are not `###` questions or `####` options.
- [ ] Existing valid structures continue to pass, including markdown lists and code blocks inside option descriptions.
- [ ] `lib/cli/commands/lint-markdown.test.ts` includes regression tests for the malformed numbered-list case and top-level stray text case.
- [ ] Workflow-generated task instructions in `lib/workflow-tasks.ts` include a short Open Questions format reminder (`###` questions ending in `?`, `####` options beneath).
