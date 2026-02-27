# Add buildTaskGraph Function

Add a `buildTaskGraph()` function to `ArtifactsRepository` that returns a graph of tasks with blocking relationships.

## Why

Downstream projects like dustbucket want to visualize task dependencies as a DAG. Dust already does all the markdown parsing needed to understand blocking relationships, but there's no single function that returns a graph object. This means every consumer reimplements the same orchestration logic, and the parsing knowledge stays locked inside dust without a clean public API.

## Implementation

The function should:
1. List all tasks and parse each one
2. Cross-reference with `findAllWorkflowTasks()` to include workflow task type on each node
3. Return a `TaskGraph` with nodes and edges arrays

```typescript
interface TaskGraphNode {
  task: Task
  workflowType: WorkflowTaskType | null
}

interface TaskGraph {
  nodes: TaskGraphNode[]
  edges: Array<{ from: string; to: string }>
}
```

The `from` field is the blocker slug, `to` is the blocked slug.

## Principles

- [Decoupled Code](../principles/decoupled-code.md)
- [Context Window Efficiency](../principles/context-window-efficiency.md)

## Blocked By

- [Export Task Type](./export-task-type.md)

## Definition of Done

- [ ] `buildTaskGraph()` method is added to `ArtifactsRepository`
- [ ] `TaskGraph` and `TaskGraphNode` types are exported from `@joshski/dust/types`
- [ ] Unit tests cover graph construction and workflow type enrichment
- [ ] Package exports fact is updated
