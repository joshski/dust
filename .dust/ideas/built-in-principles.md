# Built-in principles

Make dust's principles active by default for downstream users as inherited "core principles".

## Context

Dust ships with a comprehensive set of principles in `.dust/principles/` that guide development practices. These principles cover topics like:

- **Agent-AI collaboration**: Context-optimised code, agent autonomy, agent context inference
- **Code quality**: Small units, atomic commits, lint everything, co-located tests
- **Development workflow**: Fast feedback loops, lightweight planning, trunk-based development
- **Testing**: Comprehensive test coverage, test isolation, stubs over mocks

Currently, dust's principles are not included in the npm package (`package.json:38-43` shows only `dist`, `bin`, and selected library files are published). There is no mechanism for downstream users to inherit these principles.

## Proposed Solution

### Core principles are active by default

When a user installs dust, its principles automatically apply. Agents see them, audits reference them. This is the key design choice: dust is opinionated, and downstream users inherit that opinion without extra setup.

### Unified listing in `dust principles`

Core and local principles appear together in a single `dust principles` command, shown as separate hierarchies:

```
$ dust principles

Core
Enable Flow State
├── Human-AI Collaboration
│   ├── Ideal Agent Developer Experience
│   │   ├── Agent Autonomy
│   │   ├── ...
...

Local
Ship Fast
├── Minimal Reviews
├── ...
```

No separate `dust core principles` command is needed. Users see everything shaping their agents in one place.

### Opt-out via config exclude list

Users who disagree with a core principle can exclude it in their dust configuration:

```json
{
  "excludeCorePrinciples": [
    "atomic-commits",
    "trunk-based-development"
  ]
}
```

Excluding a parent principle excludes all its children. Excluded principles do not appear in `dust principles` and are not visible to agents or audits.

There is no mechanism for overriding a core principle with a local file. Principles are arranged in a hierarchy that may change across dust versions, making file-based overrides fragile. The choice is binary: accept a core principle or exclude it.

### Applicability section for internal principles

Some of dust's principles are specific to dust's own development (e.g. "self-contained repository") and should not be inherited by downstream users. These are marked with an `## Applicability` section:

```markdown
# Self-Contained Repository

Where possible, developers and agents should have everything they need...

## Applicability

Internal

## Parent Principle

- [Ideal Agent Developer Experience](ideal-agent-developer-experience.md)
```

- **Universal** (default, can be omitted) — inherited by downstream users as a core principle
- **Internal** — only applies to dust's own development, filtered out of the core principles list

When building the core principles list for downstream users, any principle marked `Internal` is skipped.

### Distribution

Include `.dust/principles/` in the npm package by adding it to the `files` array in `package.json`. The principles directory will be bundled with the package, ensuring:

- Principles are always available locally (no network requests)
- Version-locked to the dust version (consistency)

### Programmatic Interface

A new export following the pattern of existing exports (`@joshski/dust/artifacts`, `@joshski/dust/audits`):

```typescript
import {
  getCorePrincipleTree,
  readCorePrinciple,
  listCorePrinciples
} from "@joshski/dust/core-principles";

const tree = getCorePrincipleTree();
const slugs = listCorePrinciples();
const principle = await readCorePrinciple('atomic-commits');
```

### Implementation Approach

1. **Add `.dust/principles/` to package.json files array** — ensures principles ship with the package
2. **Add `## Applicability` section** to dust-specific principles (e.g. self-contained-repository) marking them as `Internal`
3. **Create `lib/artifacts/core-principles.ts`** — reads from the package's `.dust/principles/` directory, filters out Internal principles, respects config exclude list
4. **Update `dust principles` command** — show core and local hierarchies together
5. **Add config schema for `excludeCorePrinciples`** — array of slugs to exclude
6. **Add package.json export** — expose `@joshski/dust/core-principles`

## Open Questions

### Which principles should be marked Internal?

#### Option: Mark only obviously dust-specific principles

A pass through all existing principles, marking only those that clearly apply to dust's own development. Candidates: self-contained-repository, development-traceability. Most principles are likely universal.

#### Option: Default to Internal, explicitly mark Universal

Safer but more work upfront — every principle must be reviewed and explicitly opted in.

### Should excluded principles be hidden or shown as excluded?

#### Option: Hide excluded principles entirely

Keeps `dust principles` output clean. Users who excluded a principle don't need to see it.

#### Option: Show excluded principles as greyed out / marked

Makes exclusions discoverable. Users can see what they've opted out of without checking config.
