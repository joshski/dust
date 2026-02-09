# Unify link validation logic

`validateGoalHierarchyLinks` and `validateSemanticLinks` in `lint-markdown.ts` share roughly 80% of their implementation. Both iterate lines, track the current section heading, find markdown links, reject anchors and external URLs with nearly identical violation messages, resolve paths, and check against a required path segment.

The only differences are which section headings to match and which path segment to require. The existing `SemanticRule` interface already captures this distinction but `validateGoalHierarchyLinks` doesn't use it — it hardcodes `'## Parent Goal'`, `'## Sub-Goals'`, and `'/.dust/goals/'` instead.

Extending `SEMANTIC_RULES` to include goal hierarchy sections would eliminate the duplicate function entirely.

## Open Questions

### Should the unified function replace both existing functions?

#### Yes, merge into a single validateSemanticLinks

Add goal hierarchy entries to `SEMANTIC_RULES` and delete `validateGoalHierarchyLinks`. Simplest approach, fewest lines of code.

#### No, extract a shared helper called by both

Create a lower-level `validateSectionLinks(filePath, content, sections, requiredPath, description)` function. Both `validateSemanticLinks` and `validateGoalHierarchyLinks` become thin wrappers. Preserves the current call sites in `lintMarkdown()` without changes.
