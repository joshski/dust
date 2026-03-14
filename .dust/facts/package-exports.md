# Package Exports

The `@joshski/dust` package exposes ten entry points for downstream consumers.

## Available Exports

### @joshski/dust/types

Public type definitions for the event protocol, workflow tasks, idea structures, task graphs, and bucket repository contracts. Types-only export with no runtime code.

```typescript
import type { DustEvent, WorkflowTask, Idea, Task, TaskGraph, TaskGraphNode, Repository } from "@joshski/dust/types";
```

### @joshski/dust/logging

Debug logging framework with file and stdout channels.

```typescript
import { createLogger, enableFileLogs, isEnabled } from "@joshski/dust/logging";

const logger = createLogger("my-module");
logger.debug("Processing started");
```

### @joshski/dust/agents

Agent detection module for identifying which AI coding agent environment is running.

```typescript
import { detectAgent } from "@joshski/dust/agents";

const agent = detectAgent(); // "claude-code" | "claude-code-web" | "codex" | "unknown"
```

### @joshski/dust/artifacts

Repository interface for reading and manipulating dust artifacts (principles, facts, ideas, tasks) and workflow task operations.

```typescript
import { buildArtifactsRepository, buildReadOnlyArtifactsRepository } from "@joshski/dust/artifacts";

const repository = buildReadOnlyArtifactsRepository(fileSystem, dustPath);
const principles = await repository.listPrinciples();
const idea = await repository.parseIdea({ slug: 'my-idea' });
```

### @joshski/dust/audits

Audit framework for defining and running codebase audits.

```typescript
import { getStockAudits } from "@joshski/dust/audits";

const audits = getStockAudits();
```

### @joshski/dust/filesystem

Type definitions for the file system abstraction used throughout dust.

```typescript
import type { FileSystem, ReadableFileSystem } from "@joshski/dust/filesystem";
```

### @joshski/dust/filesystem/emulator

In-memory file system emulator for testing.

```typescript
import { createEmulatorFileSystem } from "@joshski/dust/filesystem/emulator";

const fileSystem = createEmulatorFileSystem({ '/path/to/file.txt': 'content' });
```

### @joshski/dust/istanbul/minimal-reporter

Custom Istanbul coverage reporter that shows incomplete coverage with line-level gap details.

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      reporter: ["@joshski/dust/istanbul/minimal-reporter"],
    },
  },
});
```

### @joshski/dust/biome

Path export for accessing dust's custom GritQL lint rules. The [`biome/`](../../biome) directory contains rules like `dust-no-abbreviated-names.grit` that enforce coding standards.

```typescript
import { biomePath } from "@joshski/dust/biome";
// Returns: "/path/to/node_modules/@joshski/dust/biome"
```

Or reference rules directly in your Biome config:

```json
{
  "plugins": ["./node_modules/@joshski/dust/biome/dust-no-abbreviated-names.grit"]
}
```

### @joshski/dust/validation

API for validating proposed artifact changes before applying them.

```typescript
import { validatePatch } from "@joshski/dust/validation";

const result = await validatePatch(fileSystem, dustPath, {
  files: {
    'facts/my-fact.md': '# My Fact\n\nContent here.',
    'facts/old-fact.md': null, // delete
  },
});
// result: { valid: boolean, violations: Violation[] }
```

See [Patch Validation](./patch-validation.md) for detailed API documentation.

## Related Facts

- [npm Publishing](./npm-publishing.md) - How packages are published to npm
