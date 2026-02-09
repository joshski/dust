# Reject Bullet Points in Open Questions

Fail `dust lint markdown` when an idea's Open Questions section contains bullet-point lists instead of the structured h3/h4 format.

## Goals

[Lightweight Planning](../goals/lightweight-planning.md)

## Blocked By

(none)

## Definition of Done

- [ ] `validateIdeaOpenQuestions()` in `lint-markdown.ts` detects bullet-point lines (`- ` or `* `) inside the `## Open Questions` section
- [ ] The violation message tells the author to use the h3 question / h4 option structure, and mentions that running `{bin} dust new idea` will demonstrate the expected format
- [ ] Existing ideas using bullet-point Open Questions (e.g. `github-wiki-generation.md`) are migrated to the structured format
- [ ] Tests cover: bullet-point lines rejected, mixed bullet/heading content rejected, valid h3/h4 structure still passes
