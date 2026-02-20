# Fix idea top margin in dustbucket UI

Fix the excessive top margin above markdown content for ideas with workflow tasks in the dustbucket web UI.

## Investigation Summary

The dust CLI sends idea data to dustbucket including:
- `title` - the H1 heading
- `openingSentence` - extracted first sentence (may be null)
- `content` - full markdown
- `openQuestions` - parsed open questions
- Workflow task info via `findWorkflowTaskForIdea()`

The rendering issue is in the dustbucket web service CSS, not in this repository. The fix requires changes to the dustbucket frontend code to properly handle margin/spacing when:
1. An idea has an associated workflow task (Refine/Decompose/Shelve)
2. The workflow task indicator may be adding extra margin above the content area

## Principles

(none)

## Blocked By

(none)

## Definition of Done

- [ ] The dustbucket UI displays ideas with workflow tasks without excessive top margin
- [ ] The spacing is consistent between ideas with and without workflow tasks
