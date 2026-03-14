# Idea file format

Idea files live in [`.dust/ideas/`](../ideas) as markdown files. The filename is a kebab-case slug with `.md` extension (e.g., `my-feature.md`).

## Structure

An idea file has:

- **H1 title** (required) — the idea name
- **Opening sentence** — a one-sentence summary immediately after the title
- **Body sections** (optional) — any `## ` sections providing context, motivation, related ideas, etc.
- **`## Open Questions`** (optional) — structured questions that need answering before the idea can proceed

## Open Questions format

Each question is an `### ` heading (the question text), with one or more `#### ` option headings beneath it. Each option has a name (the heading) and a description (body text below):

```markdown
## Open Questions

### Should we use WebSockets?

#### Yes, use WebSockets

Real-time updates with low latency.

#### No, use polling

Simpler to implement and debug.
```

## Parsed representation

The `parseIdea()` function in [`lib/artifacts/ideas.ts`](../../lib/artifacts/ideas.ts) returns an `Idea` object:

```typescript
interface Idea {
  slug: string
  title: string
  openingSentence: string | null
  content: string                    // raw markdown
  openQuestions: IdeaOpenQuestion[]  // parsed from ## Open Questions
}

interface IdeaOpenQuestion {
  question: string
  options: IdeaOption[]
}

interface IdeaOption {
  name: string
  description: string
}
```

## Resolving open questions

When an idea transitions (refine or decompose), open questions can be resolved. Resolutions are stored in the transition task file as a `## Resolved Questions` section with `### ` question headings and `**Decision:**` lines. These are parsed by `parseResolvedQuestions()` into `OpenQuestionResponse[]` and exposed on `WorkflowTaskMatch.resolvedQuestions`.
