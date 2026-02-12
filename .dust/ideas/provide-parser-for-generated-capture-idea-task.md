# Provide parser for generated "capture idea task"

Change the capture idea task format so downstream UIs can extract the user-entered title and description. Currently the description is embedded without clear boundaries. Add an "Idea Description" heading for the user's description and export a parser function to extract title and description verbatim from a task file.

## Context

Currently, `createCaptureIdeaTask` in `lib/workflow-tasks.ts` generates task files with this structure:

```markdown
# Add Idea: <title>

Research this idea thoroughly, then create an idea file at `<path>`. Read the codebase for relevant context, flesh out the description, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. Review `.dust/goals/` and `.dust/facts/` for relevant context. The idea should have the title "<title>" and start from the following description:

<user's description>

## Goals

(none)

## Blocked By

(none)

## Definition of Done

- [ ] Idea file exists at <path>
- [ ] Idea file has an H1 title matching "<title>"
- [ ] Idea includes relevant context from codebase exploration
- [ ] Open questions are added for any ambiguous or underspecified aspects
```

The user's description is embedded after the "start from the following description:" sentence but before the `## Goals` heading. This makes it difficult to reliably extract because:

1. The description has no explicit boundary markers
2. The description is separated from the opening sentence only by a blank line
3. Parsing requires knowing the exact format of the opening sentence template

## Existing Parsing Support

`findAllCaptureIdeaTasks` (also in `lib/workflow-tasks.ts`) already identifies capture idea tasks by:
- Scanning `.dust/tasks/` for files
- Matching titles that start with `CAPTURE_IDEA_PREFIX` ("Add Idea: ")
- Returning `{ taskSlug, ideaTitle }` for each match

However, this function does not extract the user's description -- only the idea title from the task title.

## Proposed Changes

### 1. Change the task format

Add a dedicated heading for the user's description:

```markdown
# Add Idea: <title>

Research this idea thoroughly, then create an idea file at `<path>`. Read the codebase for relevant context, flesh out the description, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. Review `.dust/goals/` and `.dust/facts/` for relevant context.

## Idea Description

<user's description>

## Goals

(none)

## Blocked By

(none)

## Definition of Done

- [ ] Idea file exists at <path>
- [ ] Idea file has an H1 title matching "<title>"
- [ ] Idea includes relevant context from codebase exploration
- [ ] Open questions are added for any ambiguous or underspecified aspects
```

### 2. Add a parser function

Export a new function like:

```typescript
export interface ParsedCaptureIdeaTask {
  ideaTitle: string
  ideaDescription: string
}

export async function parseCaptureIdeaTask(
  fileSystem: FileSystem,
  dustPath: string,
  taskSlug: string
): Promise<ParsedCaptureIdeaTask | null>
```

This function would:
- Read the task file at `${dustPath}/tasks/${taskSlug}.md`
- Verify it's a capture idea task (title starts with "Add Idea: ")
- Extract the title from the H1
- Extract the description from the "## Idea Description" section
- Return `null` if the file doesn't exist or isn't a capture idea task

## Alternative Approaches

### Use a different delimiter instead of a heading

The description could be marked with a blockquote, code fence, or HTML comment instead of a heading. However, using a standard markdown heading is more consistent with the existing task structure.

### Inline the title in the heading

Instead of `## Idea Description`, use `## Idea: <title>` to repeat the title. This would provide redundancy for parsing but might be unnecessarily verbose.

### Store metadata in YAML frontmatter

Add YAML frontmatter to capture idea task files:

```yaml
---
ideaTitle: "Progress Broadcasting"
ideaDescription: "Allow agents to broadcast progress via WebSocket."
---
```

This would make parsing trivial but would change the task file format significantly and require updating the linter to handle frontmatter.

## Integration with findAllCaptureIdeaTasks

Consider whether `findAllCaptureIdeaTasks` should be extended to also return the description (making the new `parseCaptureIdeaTask` unnecessary), or whether the functions should remain separate for single-responsibility.

## Lint Validation

The new heading (`## Idea Description`) must be added to the list of valid task headings in `lib/cli/commands/lint-markdown.ts` to avoid lint failures.

## Open Questions

### Should the parser return raw content or parsed content?

#### Return raw markdown content

The description is returned as-is from the file. Downstream consumers handle any markdown parsing or rendering. Simplest implementation.

#### Return parsed/normalized content

Trim whitespace, normalize line endings, or convert to a specific format. More work but ensures consistent output.

### Should findAllCaptureIdeaTasks be extended instead of adding a new function?

#### Keep functions separate

`findAllCaptureIdeaTasks` stays lightweight (returns slugs and titles only). Use `parseCaptureIdeaTask` when you need the description. Follows single-responsibility principle.

#### Extend findAllCaptureIdeaTasks

Add an optional parameter to include descriptions in the results. Reduces the number of functions but makes the API more complex.

### How should existing capture idea tasks be handled?

#### Migration at parse time

The parser could fall back to extracting description from the old format (text between "start from the following description:" and "## Goals"). This maintains backwards compatibility but adds complexity.

#### Ignore old format tasks

Old tasks remain parseable for their title but return `null` for description. Simple but may cause issues for downstream UIs until old tasks are completed or regenerated.

#### One-time migration script

Provide a command like `dust migrate` that rewrites existing capture idea tasks to the new format. Clean solution but requires additional tooling.
