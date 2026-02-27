# Task Graph API

Expose a function that parses all task files and returns a graph of tasks and their blocking relationships. This would let consumers render a task DAG without reimplementing the orchestration logic.

## Current Behavior

The `ArtifactsRepository` provides `listTasks()` and `parseTask()`, and each `Task` already has a `blockedBy: string[]` field parsed from `## Blocked By` sections. However, consumers who want to render a task DAG must orchestrate the list-then-parse-each loop themselves and assemble edges manually. The `Task` type is also not exported from `@joshski/dust/types`.

## Why This Matters

Downstream projects like dustbucket want to visualize task dependencies as a DAG. Dust already does all the markdown parsing needed to understand blocking relationships, but there's no single function that returns a graph object. This means every consumer reimplements the same orchestration logic, and the parsing knowledge stays locked inside dust without a clean public API.

## Proposed Changes

1. **Export `Task` from `@joshski/dust/types`** so consumers can import the type without reaching into `@joshski/dust/artifacts`
2. **Add a `buildTaskGraph()` function** that lists all tasks, parses each one, and returns a graph with nodes and edges
3. **Add `buildTaskGraph` to `ArtifactsRepository`** so it works with any `FileSystem` implementation (including GitHub API-backed ones)

## Open Questions

### Should the graph include workflow task type information?

#### Include workflow task type on each node

Enrich each task node with its `WorkflowTaskMatch` type (refine, decompose, shelve, capture) by cross-referencing with `findAllWorkflowTasks()`. This lets consumers color-code nodes by type without a second API call.

#### Keep the graph minimal

Return only `Task` objects and edges. Consumers who want workflow type info can call `findAllWorkflowTasks()` themselves. Keeps the API surface small and avoids coupling the graph to workflow concepts.

### What shape should the graph API return?

#### Nodes and edges arrays

```typescript
interface TaskGraph {
  nodes: Task[]
  edges: Array<{ from: string; to: string }>
}
```

Simple and maps directly to React Flow's data model. `from` is the blocker slug, `to` is the blocked slug.

#### Adjacency map

```typescript
interface TaskGraph {
  tasks: Map<string, Task>
  blockers: Map<string, string[]>   // slug → slugs that block it
  blocking: Map<string, string[]>   // slug → slugs it blocks
}
```

Richer structure that supports traversal in both directions, but consumers would need to convert to their visualization library's format.
