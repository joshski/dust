# Audit API with Comments

Expose the ability for downstream clients to create audit tasks with user-provided comments through both the programmatic API and CLI.

## Current State

The audit system already supports ad-hoc scope details through the CLI:

```bash
dust audit security-review "Focus on authentication flows"
```

This injects an `## Ad-hoc Scope` section into the task file using `injectAdHocScope()`. However, the programmatic API (`AuditsRepository.createAuditTask()`) does not accept this parameter:

```typescript
// Current API - no way to pass comments
createAuditTask(options: { name: string }): Promise<CreateAuditTaskResult>
```

## Proposed Changes

### API Extension

Extend `createAuditTask()` to accept an optional comment parameter:

```typescript
createAuditTask(options: {
  name: string
  comment?: string
}): Promise<CreateAuditTaskResult>
```

This enables downstream consumers (e.g., `dustbucket` integrations, custom tooling) to create audit tasks with context programmatically.

### CLI Switch

The CLI already accepts a second positional argument for ad-hoc details. A named flag could provide a more explicit interface:

```bash
dust audit security-review --comment "Focus on authentication flows"
```

## Implementation Notes

- The existing `injectAdHocScope()` function handles the markdown transformation
- Both positional argument and `--comment` flag could be supported for backwards compatibility
- The feature is straightforward to implement since the plumbing already exists in the CLI

## Open Questions

### Should "comment" use the existing Ad-hoc Scope section or a separate Comments section?

#### Reuse Ad-hoc Scope

Use the existing `## Ad-hoc Scope` section and `injectAdHocScope()` function. The term "comment" in the API would be an alias for ad-hoc scope.

- Simpler implementation - no new markdown structure
- Consistent with current behavior
- "Comment" is just a more intuitive name for the concept

#### Create a separate Comments section

Add a distinct `## Comments` section in the task file, separate from `## Ad-hoc Scope`.

- Semantic distinction between scope refinement and general notes
- More flexible - could support multiple comments over time
- Adds complexity for unclear benefit

### Should the CLI add a `--comment` flag or continue using positional arguments only?

#### Add `--comment` flag alongside positional

Support both `dust audit name "details"` and `dust audit name --comment "details"` for flexibility.

- More explicit and self-documenting
- Aligns with common CLI conventions
- Backwards compatible

#### Keep positional argument only

The current `dust audit <name> "<details>"` syntax is sufficient.

- Simpler implementation
- Less cognitive overhead
- Already documented and working
