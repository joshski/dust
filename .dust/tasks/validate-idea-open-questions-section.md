# Validate Idea Open Questions Section

Add lint validation for an optional `## Open Questions` section in idea files.

Ideas exist to eventually spawn tasks, so they start intentionally vague. The Open Questions section captures decisions that need to be made before an idea becomes actionable. Each question is an h3 heading ending with `?`, and each option is an h4 heading with markdown body content explaining the trade-offs.

## Goals

- [Lint Everything](../goals/lint-everything.md)

## Blocked By

(none)

## Definition of Done

- [ ] `validateIdeaOpenQuestions` function in `lint-markdown.ts` validates the `## Open Questions` section when present
- [ ] Questions (h3) must end with `?`
- [ ] Each question must have at least one option (h4) beneath it
- [ ] Validation is wired into the `lintMarkdown` command for `.dust/ideas/` files
- [ ] Unit tests cover valid sections, missing question marks, missing options, section boundaries, and multiple violations
- [ ] Integration tests cover the `lintMarkdown` command with idea files
- [ ] `agent-new-idea.txt` template documents the Open Questions section format
- [ ] 100% code coverage maintained
