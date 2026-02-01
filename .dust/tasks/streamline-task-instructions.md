# Streamline Task Instructions for Claude Code Web

Clean up the `agent-new-task` template output for Claude Code Web.

The `agent-new-task` template has issues when rendered for Claude Code Web:

1. **Stray `{{else}}` appears in output** - The template uses `{{else}}` but the template engine only supports `{{#if}}...{{/if}}` and `{{#unless}}...{{/unless}}`. This causes `{{else}}` to appear as literal text.

2. **"Push your commit" step should be removed** - Claude Code Web agents should not push to the remote repository as part of task creation.

## Files to Change

- `lib/templates/agent-new-task.txt` - Replace `{{#if isClaudeCodeWeb}}...{{else}}...{{/if}}` pattern with separate `{{#if}}` and `{{#unless}}` blocks; remove "Push your commit" step from Claude Code Web output (wrap step 12 in `{{#unless isClaudeCodeWeb}}`)
- `lib/cli/commands/new-task.test.ts` - Add a test that asserts the entire output content for Claude Code Web (not just `toContain()`), making it easy to spot any stray text or formatting issues

## Goals

- [Context Window Efficiency](../goals/context-window-efficiency.md)
- [Fast Feedback](../goals/fast-feedback.md)

## Blocked by

(none)

## Definition of done

- [ ] Template renders without `{{else}}` appearing in output
- [ ] Template renders without "Push your commit to the remote repository" for Claude Code Web
- [ ] Test file includes a full-content assertion for Claude Code Web output
- [ ] All existing tests pass
