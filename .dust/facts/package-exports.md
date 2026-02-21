# Package Exports

The `@joshski/dust` package exposes six entry points for downstream consumers.

## Available Exports

### @joshski/dust/types

Public type definitions for the event protocol, workflow tasks, and idea structures. Types-only export with no runtime code.

```typescript
import type { DustEvent, WorkflowTask, Idea } from "@joshski/dust/types";
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
import { readPrinciples, readFacts, readIdeas, readTasks } from "@joshski/dust/artifacts";

const principles = await readPrinciples(dustDir);
const tasks = await readTasks(dustDir);
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

Path export for accessing dust's custom GritQL lint rules. The `biome/` directory contains rules like `dust-no-abbreviated-names.grit` that enforce coding standards.

```typescript
import { biomePath } from "@joshski/dust/biome";
// Returns: "/path/to/node_modules/@joshski/dust/biome"
```

Or reference rules directly in biome.json:

```json
{
  "plugins": ["./node_modules/@joshski/dust/biome/dust-no-abbreviated-names.grit"]
}
```

## Related Facts

- [npm Publishing](./npm-publishing.md) - How packages are published to npm
