# Expose Ideas as Data Structures

Parse idea files into typed data structures that expose Open Questions as structured data. Rework `createTaskFromIdea` to accept an object that may include responses to open questions.

## Motivation

Downstream user interfaces need to present open questions as multiple-choice forms without parsing markdown or coupling to dust's structured format. By exposing ideas as typed objects with structured open questions, UIs can render forms directly from data.

## Changes

### 1. Add an `Idea` type and parser

Add a `parseIdea` function (in `lib/ideas.ts` or similar) that reads an idea markdown file and returns a typed object:

```typescript
interface IdeaOption {
  name: string
  description: string
}

interface IdeaOpenQuestion {
  question: string
  options: IdeaOption[]
}

interface Idea {
  slug: string
  title: string
  openingSentence: string
  content: string // full markdown content
  openQuestions: IdeaOpenQuestion[]
}
```

The parser should extract the `## Open Questions` section and parse each `### Question?` with its `#### Option` children into the structured format. The `description` field on each option is the full markdown text between that `####` and the next heading or end of section.

### 2. Rework `createTaskFromIdea` signature

Change `createTaskFromIdea` in `lib/workflow-tasks.ts` from:

```typescript
createTaskFromIdea(fileSystem, dustPath, ideaSlug, description?)
```

to:

```typescript
createTaskFromIdea(fileSystem, dustPath, options: CreateTaskFromIdeaOptions)
```

where:

```typescript
interface OpenQuestionResponse {
  question: string
  chosenOption: string
}

interface CreateTaskFromIdeaOptions {
  ideaSlug: string
  description?: string
  openQuestionResponses?: OpenQuestionResponse[]
}
```

### 3. Include open question responses in the task description

When `openQuestionResponses` is provided, append them to the generated task's description as markdown. For example:

```markdown
## Resolved Questions

### Should resolved decisions be preserved anywhere?

**Decision:** Git history only

### How should the UI present choices?

**Decision:** Web form generated from markdown
```

This section should appear after the opening sentence/description and before the `## Goals` heading.

### 4. Update callers and tests

- Update all callers of `createTaskFromIdea` to use the new object signature
- Update existing tests in `lib/workflow-tasks.test.ts`
- Add tests for the new `parseIdea` function
- Add tests confirming open question responses appear in generated task markdown

## Goals

- [Human-AI Collaboration](../goals/human-ai-collaboration.md)

## Blocked By

(none)

## Definition of Done

- [ ] An `Idea` type exists with `openQuestions: IdeaOpenQuestion[]` exposing structured open question data
- [ ] A `parseIdea` function parses idea markdown into the `Idea` type, correctly extracting open questions with their options
- [ ] `createTaskFromIdea` accepts an options object instead of positional `ideaSlug` and `description` parameters
- [ ] When `openQuestionResponses` are provided, a `## Resolved Questions` section is included in the generated task markdown
- [ ] Existing tests are updated and passing
- [ ] New tests cover `parseIdea` and the open question response rendering
- [ ] `bin/dust lint markdown` passes
