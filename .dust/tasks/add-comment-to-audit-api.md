# Add Comment to Audit API

Replace the ad-hoc scope mechanism with a cleaner comment parameter on the audit creation API and CLI.

## Context

The audit system currently supports ad-hoc scope details via a positional CLI argument:

```bash
dust audit security-review "Focus on authentication flows"
```

This injects an `## Ad-hoc Scope` section using `injectAdHocScope()`. However:

1. The programmatic API (`AuditsRepository.createAuditTask()`) does not accept this parameter
2. Positional arguments are less explicit than named flags
3. "Ad-hoc Scope" conflates two concepts: scope refinement and user comments

## Changes

### 1. API Extension

Extend `createAuditTask()` in `lib/audits/index.ts` to accept an optional comment:

```typescript
createAuditTask(options: {
  name: string
  comment?: string
}): Promise<CreateAuditTaskResult>
```

### 2. Markdown Transformation

Replace `injectAdHocScope()` with a new `injectComment()` function that:

- Injects a `## Comments` section (not `## Ad-hoc Scope`)
- Inserts before `## Scope` if present, otherwise appends at end
- Delete the `injectAdHocScope()` function

### 3. CLI Changes

Update `lib/cli/commands/audit.ts`:

- Add `--comment` flag for passing comments
- Remove support for positional ad-hoc details argument
- The command becomes: `dust audit security-review --comment "Focus on authentication flows"`

## Implementation Notes

- Follow [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md): keep `injectComment()` as a pure string transformation function, separate from file I/O
- Update tests to cover the new API parameter and CLI flag
- Remove tests for positional ad-hoc argument behavior

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Design for Testability](../principles/design-for-testability.md)
- [Unsurprising UX](../principles/unsurprising-ux.md)

## Blocked By

(none)

## Definition of Done

- [ ] `AuditsRepository.createAuditTask()` accepts optional `comment` parameter
- [ ] New `injectComment()` function creates `## Comments` section
- [ ] `injectAdHocScope()` function is removed
- [ ] CLI `dust audit` uses `--comment` flag instead of positional argument
- [ ] Tests updated for new behavior
- [ ] `bin/dust check` passes
