# Stricter principles format

Improve consistency and reduce noise in principle files by enforcing stricter formatting rules.

## Context

Dust's principle files in `.dust/principles/` follow a standard structure with `## Parent Principle` and `## Sub-Principles` sections for hierarchy relationships. The current format has two inconsistencies:

### Empty Sub-Principles sections

37 of 55 principle files contain empty `## Sub-Principles` sections with a `- (none)` placeholder:

```markdown
## Sub-Principles

- (none)
```

These add visual noise without conveying useful information. Leaf principles in the hierarchy (those without children) should simply omit the section entirely.

### Section ordering

Currently, `## Parent Principle` and `## Sub-Principles` are required sections (validated in `lib/lint/validators/principle-hierarchy.ts:11`), but their position within the document is not enforced. These hierarchy sections should appear at the end of the principle file, after the descriptive content.

## Proposed Changes

### 1. Remove empty Sub-Principles requirement

Update validation to make `## Sub-Principles` optional. A principle with no sub-principles should have no `## Sub-Principles` section at all.

**Files to update:**
- `lib/lint/validators/principle-hierarchy.ts:11` - Change `REQUIRED_PRINCIPLE_HEADINGS` to only require `## Parent Principle`
- `lib/artifacts/principles.ts:92` - `extractLinksFromSection` already returns an empty array when the section doesn't exist, so parsing should work unchanged
- All 37 principle files with `## Sub-Principles\n\n- (none)` - remove these sections

### 2. Enforce section ordering

Add validation that `## Parent Principle` and `## Sub-Principles` (if present) are the last sections in the document, appearing after all other content.

**Implementation approach:**
- Add a new validator function in `lib/lint/validators/principle-hierarchy.ts` that checks section order
- The validator should ensure no other `##` headings appear after `## Parent Principle` or `## Sub-Principles`

## Open Questions

### Should `## Parent Principle` also be optional for root principles?

#### Keep Parent Principle required (always)

Maintain the current behavior where every principle has a `## Parent Principle` section, even if it's `- (none)` for root principles. Currently, the root principle "Enable Flow State" has:

```markdown
## Parent Principle

- (none)
```

Pros: Consistent structure, explicit about being a root. The hierarchy parsing code in `lib/artifacts/principles.ts:88-91` expects this section.

Cons: Adds visual noise to root principles, inconsistent with proposed removal of empty Sub-Principles.

#### Make Parent Principle optional (like Sub-Principles)

Root principles can omit the `## Parent Principle` section entirely.

Pros: Consistent with Sub-Principles treatment, reduces noise for root principles.

Cons: Less explicit about being a root, requires updating parsing logic to handle missing section.

### Should we validate the section content format?

#### Only validate section presence and position

Check that required sections exist and are at the end, but don't validate the content format (e.g., list structure).

Pros: Simpler validation, more flexible for future changes.

Cons: Allows inconsistent formats within sections.

#### Also validate list format

Ensure sections contain properly formatted markdown lists with links:
- `## Parent Principle` should have exactly zero or one list item
- `## Sub-Principles` should have zero or more list items

Pros: Guarantees parseable structure, catches formatting errors early.

Cons: More complex validation, may be overly strict.
