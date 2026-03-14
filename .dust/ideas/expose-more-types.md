# Expose more types

The `@joshski/dust/types` entry point exports a subset of dust's type definitions for downstream consumers. Several useful types are either unexported or only available through other entry points, making them harder to discover and use.

## Current State

The `/types` entry point exports:
- Event protocol: `AgentSessionEvent`, `EventMessage`
- Ideas: `Idea`, `IdeaOpenQuestion`, `IdeaOption`
- Tasks: `Task`
- Task graph: `TaskGraph`, `TaskGraphNode`, `ArtifactType`
- Workflow tasks: `CreateIdeaTransitionTaskResult`, `DecomposeIdeaOptions`, `IdeaInProgress`, `OpenQuestionResponse`, `ParsedCaptureIdeaTask`, `WorkflowTaskMatch`, `WorkflowTaskType`
- Bucket: `Repository`

## Missing Types

### Core Artifact Types

**`Fact`** and **`Principle`** are the other two core artifact types alongside `Idea` and `Task`. They are defined in [`lib/artifacts/facts.ts`](../../lib/artifacts/facts.ts) and [`lib/artifacts/principles.ts`](../../lib/artifacts/principles.ts) but not exported from `/types`. A consumer wanting to build a dashboard showing all artifact types cannot currently import `Fact` or `Principle` from the types package.

### Configuration Types

**`DustSettings`** and **`CheckConfig`** define the schema for [`.dust/config/settings.json`](../config/settings.json). These are useful for consumers building configuration tools or validation, but are only available internally.

### Validation Types

**`ValidationResult`** and **`ArtifactPatch`** from the `/validation` entry point could also be exported from `/types` for consistency. `Violation` is already re-exported.

### Repository Interfaces

**`ArtifactsRepository`** is the main interface for reading and manipulating dust artifacts. While exposed from `/artifacts`, including it in `/types` would make it easier to find. Similarly, **`AuditsRepository`** and **`Audit`** from `/audits`.

### Workflow Task Types

**`AllWorkflowTasks`** is returned by `findAllWorkflowTasks()` but is not exported from `/types`.

### Event Subtypes

The `AgentSessionEvent` is a discriminated union. Named types for each variant (`AgentSessionStartedEvent`, `AgentSessionEndedEvent`, `AgentSessionActivityEvent`, `ClaudeEvent`) would make it easier to narrow and work with specific events.

## Open Questions

### Should all types be consolidated into `/types`?

#### Yes, single source of truth

Export all public types from `/types` so consumers have one place to import from. Other entry points would re-export from there.

#### No, keep types co-located with their modules

Keep types exported from their relevant entry points (`/validation`, `/audits`, etc.). Only add truly cross-cutting types to `/types`.

### Should event variants be named types?

#### Yes, extract named types

Create `AgentSessionStartedEvent`, `AgentSessionEndedEvent`, etc. as exported types. This makes it easier to write type guards, narrow in switch statements, and document the schema.

#### No, keep as inline union members

The current inline union is sufficient. Consumers can extract types themselves with `Extract<AgentSessionEvent, { type: 'agent-session-started' }>`.
