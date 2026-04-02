# Context Window Efficiency Audit

Add a stock audit that identifies code patterns that burden agent context windows, making the codebase harder for AI agents to understand and modify.

## Context

The "context-optimised-code" principle states that code should be structured so that agents can understand and modify it within their context window constraints. The "context-window-efficiency" principle emphasizes designing with short attention spans in mind.

AI agents have limited context windows and work most effectively when:
- Files are small enough to read completely
- Functions are focused and self-contained
- Dependencies are explicit and minimal
- Related code is co-located
- Abstractions don't obscure intent

Currently, there is no stock audit to systematically identify context window problems. Common issues include:
- Very large files (thousands of lines)
- Long functions with many responsibilities
- Deep nesting that's hard to follow
- Circular or tangled dependencies
- Code spread across many distant files
- Abstractions that require reading many files to understand one thing

## Proposed Audit

Create a `context-window-efficiency` stock audit in `lib/audits/stock-audits.ts` that:

1. **Identifies large units**:
   - Files over a threshold (e.g., 500-1000 lines)
   - Functions over a threshold (e.g., 50-100 lines)
   - Classes with many methods (e.g., 10+ methods)
   - Deeply nested code (e.g., 4+ levels of nesting)

2. **Detects scattered concerns**:
   - Related functionality spread across many files
   - Features requiring reading 5+ files to understand
   - Circular import dependencies
   - Functions with many dependencies

3. **Suggests improvements**:
   - Extract functions or modules to reduce file size
   - Co-locate related functionality
   - Simplify deep nesting with early returns or extraction
   - Reduce dependency fan-out

## Related Principles

- **context-optimised-code** - Primary principle this audit enforces
- **context-window-efficiency** - Design for short attention spans
- **decoupled-code** - Reduce dependencies between units
- **intuitive-directory-structure** - Co-locate related concerns
- **small-units** - Keep things discrete and fine-grained

## Example Patterns to Detect

```javascript
// Very large file (1000+ lines)
// Makes it hard to load the whole file into context

// Long function with many responsibilities
function processOrder(order) {
  // 100+ lines doing validation, pricing, inventory, shipping, notifications
}

// Deep nesting
function handleRequest(req) {
  if (req.authenticated) {
    if (req.hasPermission) {
      if (req.data.valid) {
        if (req.data.items.length > 0) {
          // actual logic buried 4 levels deep
        }
      }
    }
  }
}

// Scattered concern: understanding "order processing" requires reading:
// - controllers/order-controller.ts
// - services/order-service.ts
// - models/order.ts
// - repositories/order-repository.ts
// - validators/order-validator.ts
// - utils/order-helpers.ts
```

## Output Format

For each context window issue found, create ideas containing:
- Type of issue (large file, long function, deep nesting, scattered concern)
- Location and metrics (line count, nesting depth, file count, etc.)
- Why it burdens context windows
- Suggested refactoring approach
- Related code that should be considered together

## Open Questions

### What thresholds should trigger findings?

#### Option: Conservative thresholds

Use strict limits: 300-line files, 30-line functions, 3-level nesting.

Pros: Keeps code very modular
Cons: May be too strict for some legitimate cases

#### Option: Moderate thresholds

Use balanced limits: 500-line files, 50-line functions, 4-level nesting.

Pros: Pragmatic balance
Cons: May still allow problematic complexity

#### Option: Aggressive thresholds

Use loose limits: 1000-line files, 100-line functions, 5-level nesting.

Pros: Only flags egregious cases
Cons: Misses many opportunities for improvement

#### Option: Configurable thresholds

Allow projects to configure thresholds in `.dust/config/settings.json`.

Pros: Flexible per-project
Cons: May be set too high, requires configuration

### Should the audit account for file type?

#### Option: Different thresholds by file type

Allow larger config files, stricter limits on logic files.

Pros: Context-appropriate limits
Cons: Requires file type classification

#### Option: Uniform thresholds

Apply same limits regardless of file type.

Pros: Simpler, consistent
Cons: May flag acceptable large config files

### How should the audit detect scattered concerns?

#### Option: Analyze import graphs

Build a dependency graph and identify clusters of files that are always used together.

Pros: Objective, data-driven
Cons: Complex to implement, may miss logical groupings

#### Option: Use naming patterns

Files with related names (e.g., `order-*.ts`) might represent a scattered concern.

Pros: Simple heuristic
Cons: Unreliable, misses unnamed patterns

#### Option: Manual identification

Don't attempt automated detection; let reviewers identify scattered concerns.

Pros: Avoids false positives
Cons: Less comprehensive

### Should the audit consider agent-specific context limits?

#### Option: Target specific model context windows

Use known context limits for Claude/GPT models to inform thresholds.

Pros: Aligned with actual agent capabilities
Cons: Couples to specific models, limits change over time

#### Option: Generic "small unit" guidance

Focus on general principles without specific token counts.

Pros: Future-proof, model-agnostic
Cons: Less precise guidance

### How should the audit handle generated code?

#### Option: Exclude generated files

Don't audit auto-generated code (migrations, protobuf, etc.).

Pros: Focuses on maintainable code
Cons: Requires detecting generated files

#### Option: Flag all violations

Audit everything including generated code.

Pros: Comprehensive
Cons: Noisy, generates unfixable findings

### Should the audit suggest specific refactoring strategies?

#### Option: Provide concrete examples

Show how to extract functions, split files, reduce nesting, etc.

Pros: Educational, actionable
Cons: May not fit codebase patterns

#### Option: Identify pattern only

Flag violations without prescribing fixes.

Pros: Avoids potentially wrong suggestions
Cons: Less actionable
