# Review links in stock audits

Relative markdown links from stock audits to principles will fail when stock audits are consumed by downstream repositories. This breaks the documentation trail that helps agents understand the reasoning behind audit checks.

## Context

### Current Implementation

Stock audits in `lib/audits/stock-audits.ts` contain relative markdown links to principles stored in `.dust/principles/`:

```markdown
The [Fast Feedback Loops](../principles/fast-feedback-loops.md) principle emphasizes...
The [Comprehensive Assertions](../principles/comprehensive-assertions.md) principle covers...
The [Stop the Line](../principles/stop-the-line.md) principle is violated...
The [Traceable Decisions](../principles/traceable-decisions.md) principle emphasizes...
```

These links work within the dust repository itself but break in downstream repositories because:
1. Stock audits are distributed via the `@joshski/dust/audits` npm package export
2. Downstream repositories don't have the dust repository's principle files at `../principles/`
3. Downstream repositories have their own `.dust/principles/` directory with potentially different content

### Why Links Exist

The links serve an important purpose: they provide context about the **reasoning** behind audit checks. For example:

- The **Test Assertions** audit links to "Comprehensive Assertions" and "Self-Diagnosing Tests" to explain why certain assertion patterns matter
- The **CI Development Parity** audit links to "Reproducible Checks" and "Stop the Line" to explain why CI/local differences are problematic
- The **Feedback Loop Speed** audit links to "Fast Feedback Loops" to explain why slow checks harm agent productivity

### Scale of the Problem

Based on exploration, there are **8 link references** to principles across the stock audits file (lib/audits/stock-audits.ts:552, 1645, 1704, 1731, 2269, 2359, 2383, 2422), referencing these principles:
- Fast Feedback Loops
- Comprehensive Assertions
- Self-Diagnosing Tests
- Reproducible Checks
- Stop the Line
- Traceable Decisions

### Related Concerns

This problem is related to (but distinct from) the [Audit Template Interpolation](audit-template-interpolation.md) idea, which addresses dust **command references** (like `dust principles`) rather than markdown links to files.

## Proposed Solution

Remove the relative markdown links and inline the essential intent of each linked principle directly into the audit text. This makes audits self-contained while preserving the reasoning that makes them valuable.

### Example Transformation

**Before:**
```markdown
The [Fast Feedback Loops](../principles/fast-feedback-loops.md) principle emphasizes that the primary feedback loop—write code, run checks, see results—should be as fast as possible.
```

**After:**
```markdown
Fast feedback loops are critical: the primary feedback loop—write code, run checks, see results—should be as fast as possible. Agents especially benefit because they operate in tight loops of change-and-verify; slow feedback wastes tokens and context window space on waiting rather than working.
```

**Before:**
```markdown
The [Comprehensive Assertions](../principles/comprehensive-assertions.md) principle covers asserting whole objects rather than fragments.
```

**After:**
```markdown
Comprehensive assertions (asserting whole objects rather than fragments) provide richer failure diagnostics—showing the complete actual value alongside the complete expected value.
```

### Benefits

1. **Works everywhere**: No broken links in downstream repositories
2. **Self-contained**: Agents get the context they need without following external references
3. **Maintains intent**: The reasoning behind audit checks remains clear
4. **Token efficient**: Agents don't need to read separate files to understand context
5. **Aligns with principles**: Follows the [Context Window Efficiency](../principles/context-window-efficiency.md) principle by reducing indirection

### Trade-offs

1. **Duplication**: Principle content is copied rather than referenced
2. **Maintenance burden**: Changes to principles require updating inlined summaries
3. **Risk of drift**: Inlined summaries may become outdated if principles evolve
4. **Slightly longer audits**: Inlining adds content to audit templates

## Open Questions

### Should we inline the full principle or just its core message?

#### Option: Inline only the one-sentence summary
Extract just the essence (e.g., "Fast feedback loops should be as fast as possible") and drop the elaboration. Keeps audits concise.

**Pros:**
- Minimal token overhead
- Easy to maintain
- Still provides the "why" behind the audit

**Cons:**
- Loses valuable context that helps agents understand nuance
- May not provide enough reasoning for complex principles
- Agents may need to search for more context anyway

#### Option: Inline 1-2 paragraphs of principle content
Include enough detail so agents understand both the principle and its application to the audit concern.

**Pros:**
- Self-contained and comprehensive
- Agents get full context without external reads
- Reduces back-and-forth research

**Cons:**
- Longer audit templates
- More maintenance when principles change
- Some duplication across multiple audits that reference the same principle

### Should we add a reference comment to the original principle?

#### Option: Yes - add HTML comments with principle slugs
```markdown
<!-- See principle: fast-feedback-loops -->
Fast feedback loops are critical...
```

**Pros:**
- Maintainers can trace inlined content back to source
- Easier to update inlined content when principles change
- Provides audit to know which principle inspired the text

**Cons:**
- HTML comments clutter the markdown
- Not visible to agents reading the audit
- Adds maintenance metadata to what should be standalone content

#### Option: No - make audits fully independent
Remove all references and make audits self-documenting artifacts.

**Pros:**
- Clean, focused audit content
- No coupling between audits and principles
- Simpler mental model

**Cons:**
- Harder to maintain consistency with principles
- Lost traceability of where reasoning came from
- May drift from principles over time

### What about principles that don't exist in downstream repos?

#### Option: Always inline - never assume downstream principles exist
Treat all principle references as potentially broken and inline them.

**Pros:**
- Consistent approach
- Works for all downstream repositories
- Self-contained audits

**Cons:**
- May duplicate content if downstream repo has the same principles
- Doesn't leverage shared dust artifacts

#### Option: Detect and conditionally inline
Check if the referenced principle exists in the downstream repo before deciding to inline or link.

**Pros:**
- Best of both worlds: links when available, inlining when not
- Respects downstream principle organization

**Cons:**
- Complex implementation
- Template generation becomes stateful
- Audits are no longer static content

### Should this change apply to all artifact cross-references?

#### Option: Yes - establish a pattern for all distributed content
Apply this approach consistently to any dust content that references other artifacts and will be distributed outside its source repository.

**Pros:**
- Consistent policy across the project
- Clearer mental model for what content should be self-contained
- Prevents similar issues in the future

**Cons:**
- Larger scope of change
- May not be appropriate for all artifact types
- Could eliminate valuable cross-referencing in some contexts

#### Option: No - scope to stock audits only
Stock audits are unique because they're distributed via npm; other artifacts don't have this constraint.

**Pros:**
- Focused, minimal change
- Preserves rich linking within repository artifacts
- Simpler implementation

**Cons:**
- May need to revisit if other artifacts get distributed
- Inconsistent treatment of cross-references
