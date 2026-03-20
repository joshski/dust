# Compressed principles listing

Replace the tree-based `dust principles` output with a compact, agent-optimised format.

## Context

The current `dust principles` output renders two full hierarchy trees (Core and Local) followed by a flat list with repeated file paths. This produces 100+ lines of output where most of the content is tree-drawing characters (`├──`, `│`, `└──`) and repeated `.dust/principles/` path prefixes. Agents are the primary consumers of this command, and they don't benefit from visual tree rendering.

## Proposed Solution

### Remove hierarchy from listing

Drop the tree rendering entirely. The hierarchy information is available in each principle's body (via `## Parent Principle` and `## Sub-Principles` sections) if an agent needs it. The listing should help agents decide *which* principles to read, not visualise their relationships.

### Compact format

State each directory once as a header, then list principles as `slug.md — opening sentence`:

```
🎯 Core Principles (node_modules/@joshski/dust/.dust/principles/)

actionable-errors.md — Error messages should tell you what to do next, not just what went wrong.
agent-autonomy.md — Dust exists to enable AI agents to produce work autonomously.
atomic-commits.md — Each commit should tell a complete story.

🎯 Local Principles (.dust/principles/)

batteries-included.md — Dust should provide everything required for an agent to be productive.
agent-agnostic-design.md — Dust should work with multiple agents without favoring one.
```

Including the `.md` extension means agents can construct the full read path by concatenating the header directory with the filename.

### Implementation Approach

1. **Update `lib/cli/commands/list.ts`** — replace `buildPrincipleTree` and `renderHierarchy` with a flat listing function
2. **Resolve the core principles directory path** — use the installed package location to build the header path
3. **Keep the principle hierarchy validator** — the hierarchy still has value for lint consistency, even though it's no longer rendered in the listing

## Open Questions

### Should we keep a tree view available as a flag?

#### Option: No tree view at all

The hierarchy is in the files. Anyone who wants to see it can read the principle files. Fewer code paths to maintain.

#### Option: `--tree` flag for human browsing

Keeps the tree available for humans who want to browse the hierarchy, but the default output is optimised for agents.
