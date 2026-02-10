# Disallow Open Questions Heading in Incorrect Case

Add a lint violation for idea files that contain an `## Open Questions` heading with incorrect casing (e.g. `## open questions`, `## Open questions`, `## OPEN QUESTIONS`).

Currently, both `parseOpenQuestions` in `lib/ideas.ts:60` and `validateIdeaOpenQuestions` in `lib/cli/commands/lint-markdown.ts:230` use exact string matching (`line === '## Open Questions'`). If an author writes the heading in the wrong case, it is silently ignored — the section is not parsed, and no lint violation is reported. This makes it easy for questions to be accidentally missed.

The fix should add a case-insensitive check to the linter that flags any h2 heading whose text matches "open questions" in a case-insensitive comparison but does not exactly match `## Open Questions`. The violation message should tell the author the correct casing.

## Goals

- [Lint Everything](../goals/lint-everything.md)

## Blocked By

(none)

## Definition of Done

- [ ] `validateIdeaOpenQuestions` in `lib/cli/commands/lint-markdown.ts` reports a violation when an idea file contains an h2 heading that case-insensitively matches "Open Questions" but is not exactly `## Open Questions` (e.g. `## open questions`, `## Open questions`, `## OPEN QUESTIONS`)
- [ ] The violation message includes the expected casing, e.g. `Heading "## open questions" should be "## Open Questions"`
- [ ] Tests in `lib/cli/commands/lint-markdown.test.ts` cover at least: `## open questions`, `## Open questions`, `## OPEN QUESTIONS`
- [ ] `bin/dust lint markdown` passes
- [ ] `bun test` passes
