# Built-in principles

Make dust's own principles available to downstream users as read-only "core principles".

## Context

Dust ships with a comprehensive set of principles in [`.dust/principles/`](../principles) that guide development practices. These principles cover topics like:

- **Agent-AI collaboration**: Context-optimised code, agent autonomy, agent context inference
- **Code quality**: Small units, atomic commits, lint everything, co-located tests
- **Development workflow**: Fast feedback loops, lightweight planning, trunk-based development
- **Testing**: Comprehensive test coverage, test isolation, stubs over mocks

Currently, dust's principles are not included in the npm package (`package.json:38-43` shows only `dist`, `bin`, and selected library files are published). There is no mechanism for downstream users to import or reference these principles.

## Proposed Solution

Expose dust's principles as read-only "core principles" through both CLI and programmatic interfaces. The "core" namespace clearly distinguishes these built-in principles from a user's local [`.dust/principles/`](../principles) directory.

### CLI Interface

Two new commands following the existing command syntax patterns (verb-then-noun with spaces):

```
dust core principles        # List all core principles (tree view)
dust read core principle <name>  # Display a specific core principle
```

Example output:

```
$ dust core principles
Enable Flow State
├── Human-AI Collaboration
│   ├── Ideal Agent Developer Experience
│   │   ├── Agent Autonomy
│   │   ├── ...
...

$ dust read core principle atomic-commits
# Atomic Commits

Commits should be atomic: each commit contains exactly one logical change...
```

### Programmatic Interface

A new export following the pattern of existing exports (`@joshski/dust/artifacts`, `@joshski/dust/audits`):

```typescript
import {
  getCorePrincipleTree,
  readCorePrinciple,
  listCorePrinciples
} from "@joshski/dust/core-principles";

// Get the full tree structure (names and titles)
const tree = getCorePrincipleTree();
// Returns: { slug: 'enable-flow-state', title: 'Enable Flow State', children: [...] }

// List all principle slugs
const slugs = listCorePrinciples();
// Returns: ['enable-flow-state', 'human-ai-collaboration', 'atomic-commits', ...]

// Read a specific principle
const principle = await readCorePrinciple('atomic-commits');
// Returns: { slug: 'atomic-commits', title: 'Atomic Commits', content: '...', ... }
```

### Distribution

Include [`.dust/principles/`](../principles) in the npm package by adding it to the `files` array in `package.json`. The principles directory will be bundled with the package, ensuring:

- Principles are always available locally (no network requests)
- Version-locked to the dust version (consistency)
- Supports both CLI and programmatic access

### Implementation Approach

1. **Add [`.dust/principles/`](../principles) to package.json files array** - ensures principles ship with the package
2. **Create `lib/artifacts/core-principles.ts`** - new module exposing core principles:
   - Uses existing `Principle` type and parsing logic from [`lib/artifacts/principles.ts`](../../lib/artifacts/principles.ts)
   - Builds a `ReadableFileSystem` that reads from the package's [`.dust/principles/`](../principles) directory
   - Exports `getCorePrincipleTree()`, `listCorePrinciples()`, `readCorePrinciple(slug)`
3. **Add CLI commands** - register `'core principles'` and `'read core principle'` in the command registry
4. **Add package.json export** - expose `@joshski/dust/core-principles`

### Benefits

1. **Reduced friction**: Users can browse battle-tested principles immediately
2. **Community alignment**: Teams using dust share a common vocabulary
3. **Principle evolution**: As dust's principles are refined, adopters benefit from improvements
4. **Clear separation**: "core" namespace distinguishes built-in from local principles

### Out of Scope

The following are separate concerns for future ideas:

- **Customization**: Overriding or extending core principles locally
- **`dust init` integration**: Prompting users to adopt core principles during initialization
- **Merging**: Combining core and local principles in a unified view

## Open Questions

### Should the export return parsed Principle objects or raw content?

#### Option: Return parsed Principle objects

Use the existing `Principle` type from [`lib/artifacts/principles.ts`](../../lib/artifacts/principles.ts):

```typescript
interface Principle {
  slug: string;
  title: string;
  content: string;
  parentPrinciple: string | null;
  subPrinciples: string[];
}
```

Pros: Consistent with existing artifacts API, hierarchy relationships already resolved.

Cons: Callers may only need the content, parsing adds overhead.

#### Option: Return raw markdown content

Return just the markdown string:

```typescript
const content = await readCorePrinciple('atomic-commits');
// Returns: "# Atomic Commits\n\nCommits should be atomic..."
```

Pros: Simpler, no parsing overhead, callers can parse as needed.

Cons: Inconsistent with artifacts API, callers must parse hierarchy links themselves.

### How should we handle hierarchy links in core principles?

#### Option: Keep relative links as-is

Core principles use relative markdown links in their parent and sub-principle sections to reference other principles. Keep these unchanged.

Pros: No content transformation, preserves original files.

Cons: Links won't work if rendered in isolation or in downstream documentation.

#### Option: Transform links to absolute references

Replace relative links with a canonical format like `core:small-units` or full URLs to the dust repository.

Pros: Links remain meaningful in any context.

Cons: Content transformation adds complexity, URL links could break.

#### Option: Expose alongside local principles

When listing principles, downstream users could opt to see both core and local principles together, with hierarchy links resolved correctly.

Pros: Unified experience, links work naturally.

Cons: Increases scope, conflates core and local namespaces.
