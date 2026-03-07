# Apply artifact-writing guidance to workflow task templates

Add explicit opening-sentence and lint checks to workflow task templates that ask agents to author ideas or tasks.

## Context

Workflow tasks are often the only instructions an agent reads before creating artifacts.

- `lib/artifacts/workflow-tasks.ts` generates capture (`createIdeaTask`) and transition tasks (`createRefineIdeaTask`, `decomposeIdea`).
- Current templates strongly guide research and Open Questions format, but do not consistently remind agents about opening-sentence constraints enforced by lint.
- Lint validators (`lib/lint/validators/content-validator.ts`) apply opening-sentence and length checks to all artifact content files, and imperative checks to tasks.

Result: agents can satisfy workflow-template instructions while still violating lint rules.

## Proposed Changes

Add a short lint-compatible writing checklist to workflow templates that produce new artifacts.

Initial scope:

- Capture idea task template (`createIdeaTask` non-expedite path): checklist for idea files.
- Refine idea task template (`createRefineIdeaTask`): checklist for edits to idea files.
- Decompose idea task template (`decomposeIdea`): checklist for newly created task files.
- Expedite idea template: include task-writing checklist only for the branch where new task files are created.

Checklist content should be role-specific:

- For idea outputs: opening sentence immediately after H1, plain paragraph sentence, <= 150 chars.
- For task outputs: same rules plus imperative opening sentence.
- Include a reminder to run `dust lint` before committing workflow-task outputs.

## Proposed Template Snippet (Example)

```markdown
Before finalizing generated artifacts:
- Ensure each new or edited idea/task file has a valid opening sentence right after the H1.
- Keep the first sentence <= 150 characters.
- For task files, make the opening sentence imperative.
- Run `dust lint` and fix violations before commit.
```

## Implementation Notes

- `lib/artifacts/workflow-tasks.test.ts` has exact string assertions for template output and will require updates.
- Keep this checklist concise; workflow opening sentences already carry substantial instruction text.
- Use the same wording source as CLI instructions if a shared helper is introduced by related work.

## Open Questions

### Should workflow templates include explicit `dust lint` guidance or rely on higher-level checks?

#### Option: Explicit `dust lint` in each relevant template

Keep prevention local to the workflow instruction where artifacts are authored.

#### Option: Omit explicit lint mention

Rely on broader project guidance (`dust check`, task implementation templates) to avoid repeating command reminders.

### Should checklist text be embedded in each template or injected from a shared formatter?

#### Option: Shared formatter

Use one canonical checklist source for CLI and workflow templates to avoid rule drift.

#### Option: Template-local text

Keep workflow templates self-contained and optimized for task-specific context.
