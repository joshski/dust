# Remove checkbox syntax from Definition of Done

Dust should not use or accept `- [ ]` checkbox syntax in Definition of Done sections. Plain `-` bullets are correct; checkboxes are redundant noise.

## Context

The inconsistency surfaced when an agent saw dust instructions in two different places: one said "using `- ` for each item", while another said "using `- [ ]` for each item". The resolution is clear: plain `-` bullets are correct, and `- [ ]` syntax should not appear anywhere.

In the current source, the instructions and generated templates already use plain `-` bullets correctly:

- `lib/cli/commands/new-task.ts` says "using `- ` for each item"
- `lib/artifacts/workflow-tasks.ts` generates DoD items as `` `- ${item}` ``

However, two gaps remain:

1. **Test data**: `lib/bucket/repository.test.ts` uses `- [ ] Done` as the content of a "valid" task — implicitly treating checkbox syntax as acceptable
2. **No lint rule**: The `extractDefinitionOfDone` parser in `lib/artifacts/tasks.ts` uses the regex `/^-\s+(.+)$/`, which accepts `- [ ] Done` and passes `[ ] Done` (including the checkbox noise) as the extracted item text. Nothing actively rejects checkbox bullets.

## What Needs to Change

- Update the test data in `lib/bucket/repository.test.ts` to use plain `- Done` instead of `- [ ] Done`
- Consider adding a lint rule that rejects `- [ ]` items in Definition of Done sections, to prevent future regressions
