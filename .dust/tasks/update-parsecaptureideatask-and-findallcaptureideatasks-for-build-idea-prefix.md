# Update parseCaptureIdeaTask and findAllCaptureIdeaTasks for Build Idea prefix

Update `parseCaptureIdeaTask` to detect the `Build Idea:` prefix and return a `buildItNow` flag. Update `findAllCaptureIdeaTasks` to also discover `Build Idea:` tasks.

## Change Details

In `lib/workflow-tasks.ts`:

1. Update `ParsedCaptureIdeaTask` interface to include `buildItNow: boolean`.
2. Update `parseCaptureIdeaTask` to:
   - Recognize both `Add Idea:` and `Build Idea:` prefixes
   - Set `buildItNow: true` when the prefix is `Build Idea:`
   - Set `buildItNow: false` for `Add Idea:` tasks
3. Update `findAllCaptureIdeaTasks` to also match tasks with the `Build Idea:` prefix.
4. Add tests for parsing and discovering `Build Idea:` tasks.

## Goals

- [Agent Autonomy](../goals/agent-autonomy.md)

## Blocked By

- [Add build-it-now mode to createCaptureIdeaTask](add-build-it-now-mode-to-createcaptureideatask.md)

## Definition of Done

- [ ] `parseCaptureIdeaTask` returns `buildItNow: true` for `Build Idea:` tasks
- [ ] `parseCaptureIdeaTask` returns `buildItNow: false` for `Add Idea:` tasks
- [ ] `findAllCaptureIdeaTasks` discovers both `Add Idea:` and `Build Idea:` tasks
- [ ] Tests cover parsing and discovery of both prefixes
- [ ] `bin/dust check` passes
