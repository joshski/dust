# Naming Clarity Audit

Add a stock audit that identifies unclear names that violate the "clarity-over-brevity" and "naming-matters" principles.

## Context

The "clarity-over-brevity" principle states that names should be descriptive and self-documenting, even if longer. The "naming-matters" principle emphasizes that good naming reduces waste by eliminating confusion and making code self-documenting.

The codebase already has strong naming enforcement through:
- **Linting policy** (`lib/lint/policy-checker.ts`) that rejects 18 common abbreviations: `ctx`, `deps`, `fs`, `args`, `req`, `res`, `err`, `cb`, `fn`, `opts`, `params`, `obj`, `val`, `idx`, `len`, `tmp`, `str`, `num`
- **Ubiquitous language audit** for terminology consistency and factory naming patterns
- **Consistent naming conventions** across the codebase (e.g., `create*`, `parse*`, `extract*`, `find*`, `check*`, `is*` function prefixes)

However, there is no stock audit to systematically identify clarity issues beyond the hardcoded abbreviation list. Common violations that slip through include:
- Single-letter variable names outside acceptable contexts (loop indices `i`, `j`; sort comparators `a`, `b`)
- Domain-specific abbreviations not in the banned list (e.g., `usr`, `btn`, `msg` in non-callback contexts)
- Generic names that provide no information when used in broader scopes (e.g., `data`, `info`, `temp`, `handle`, `manager`, `helper`)
- Misleading names that don't match their purpose
- Inconsistent naming patterns within the same module (e.g., mixing `get*`, `fetch*`, `retrieve*` for similar operations)

## Proposed Audit

Create a `naming-clarity` stock audit in `lib/audits/stock-audits.ts` that complements existing naming enforcement by focusing on clarity patterns that can't be captured by static linting rules.

This audit should:

1. **Search for context-dependent clarity issues**:
   - Single-letter variables outside acceptable contexts:
     - **Acceptable**: Loop indices (`i`, `j`, `k`), sort comparators (`a`, `b`), short iteration variables in tiny scopes (`p` for principle, `q` for question, `v` for violation)
     - **Problematic**: Single-letter function parameters, module-level variables, or usage in large functions
   - Generic placeholder names used inappropriately:
     - **Acceptable**: `data` in event handlers (`proc.stderr.on('data', ...)`), `result` for immediate function returns, `match` for regex results, `lines` after splitting content
     - **Problematic**: `data`, `temp`, `handle`, `manager`, `helper`, `value` as function parameters or in broader scopes where specificity would aid clarity
   - Abbreviations beyond the linting policy that lack clarity:
     - Already banned by linting: `ctx`, `deps`, `fs`, `args`, `req`, `res`, `err`, `cb`, `fn`, `opts`, `params`, `obj`, `val`, `idx`, `len`, `tmp`, `str`, `num`
     - Examples of patterns to flag: `usr`, `btn`, `msg` (outside event callbacks), `cfg`, `prop`, `attr`
   - Inconsistent naming patterns within the same module or related functions

2. **Analyze scope and context**:
   - Scope size: Small scopes (3-5 lines) tolerate terse names; larger scopes demand clarity
   - Usage patterns: Names in tight loops vs function parameters vs module exports
   - Established codebase conventions: Respect consistent patterns like `msg` in callbacks or `content`/`lines` in parsing contexts
   - Framework idioms: Don't flag well-known patterns from TypeScript, Node.js, or testing frameworks

3. **Generate actionable findings**:
   - Document each unclear name with file location and line number
   - Explain why the name lacks clarity (scope too large, no context, misleading)
   - Suggest more descriptive alternatives based on usage analysis
   - Group related occurrences (e.g., all uses of `usr` instead of `user`)

## Related Principles

- **clarity-over-brevity** - Primary principle this audit enforces
- **naming-matters** - Emphasizes importance of good naming
- **consistent-naming** - Names should follow conventions
- **context-optimised-code** - Clear names reduce cognitive load

## Codebase Analysis Findings

Research of the dust codebase (`lib/` directory) reveals:

**Strong existing naming conventions**:
- Function prefixes: `get*`, `create*`, `parse*`, `extract*`, `find*`, `check*`, `validate*`, `is*`
- Type suffixes: `*Config`, `*Options`, `*Result`, `*Service`, `*Manager`
- Consistent use of full names in function parameters and module exports
- Linting policy enforces 18 banned abbreviations at the AST level

**Acceptable terse patterns observed**:
- Loop indices: `i`, `j`, `k`
- Sort comparators: `a`, `b`
- Short iteration variables in tight scopes: `p` (principle), `q` (question), `o` (option), `v` (violation), `f` (file)
- Event handler parameters: `msg`, `data` (in specific callback contexts)
- Immediate result variables: `result`, `match`, `lines`, `parts`, `content` (when contextually narrow)

**Gaps in current enforcement**:
- No systematic detection of generic names in broad scopes (`handle`, `manager`, `helper` as parameters)
- No inconsistency detection for naming patterns across related functions
- No scope-aware analysis (same name acceptable in 3-line scope, problematic in 50-line scope)
- No detection of misleading names that don't match behavior

## Relationship to Existing Audits

This audit complements but does not duplicate:
- **Ubiquitous language audit**: Focuses on domain terminology consistency and factory naming patterns, not general identifier clarity
- **Primitive obsession audit**: Detects free-form literals where types exist, not identifier naming
- **Idiomatic style audit**: Checks framework conventions, not naming clarity
- **Linting policy** (`lib/lint/policy-checker.ts`): Enforces a fixed list of 18 banned abbreviations at compile time; this audit provides runtime context-aware analysis beyond that list

## Example Patterns to Detect

```typescript
// Cryptic abbreviations beyond the linting policy
const usr = getUser()  // Should be: user
const btn = document.querySelector()  // Should be: button
const cfg = loadConfig()  // Should be: config

// Generic unhelpful names in broad scopes
function process(data: unknown) {  // What kind of data? What processing?
  // 30 lines of code
}
const temp = calculate()  // Temporary what? Why temporary?

// Single-letter names in large scopes
function handleRequest(r: Request, c: Context) {  // Should be: request, context
  // 50 lines of code using r and c
}

// Inconsistent naming patterns
function getUser() { ... }
function fetchAccount() { ... }
function retrieveProfile() { ... }  // Pick one pattern (get*, fetch*, or retrieve*) and stick with it

// Acceptable patterns (should NOT be flagged)
for (let i = 0; i < items.length; i++) { ... }  // Loop index: OK
const sorted = items.sort((a, b) => a.name.localeCompare(b.name))  // Sort comparator: OK
proc.stderr.on('data', (data: Buffer) => { ... })  // Event handler: OK
const result = parseContent(input)  // Immediate return value: OK
```

## Implementation Guidance

Following the pattern of existing stock audits (see `lib/audits/stock-audits.ts`), the audit template should include:

1. **Standard sections** (like all stock audits):
   - Title: "Naming Clarity Audit"
   - Opening sentence describing the audit goal
   - `${ideasHint}` constant for consistent guidance
   - **Scope** section listing what to search for
   - **Analysis Steps** section with numbered methodology
   - **Applicability** section explaining when this audit applies
   - **Output Format** section describing findings structure
   - **Blocked By** section (likely "none")
   - **Definition of Done** checklist with final line: "No changes to files outside `.dust/`"

2. **Analysis approach**:
   - Use grep/search to find candidate patterns (single-letter variables, common abbreviations)
   - Read surrounding code to determine scope and context
   - Apply context-aware rules to filter false positives
   - Group findings by pattern type (cryptic abbreviations, generic names, inconsistent patterns)
   - Generate ideas for each significant finding

3. **Output format for findings**:
   ```
   For each naming clarity issue:
   - **Location**: file:line
   - **Current name**: identifier
   - **Issue**: Why it lacks clarity (scope too large, misleading, generic, inconsistent)
   - **Context**: Scope size, usage pattern, function purpose
   - **Suggested name**: More descriptive alternative
   - **Related occurrences**: Other instances of the same pattern
   ```

## Resolved Questions

### How should the audit handle domain-specific abbreviations?

**Decision**: Option: Learn from codebase patterns

**Rationale**: The dust codebase demonstrates that context-aware pattern learning works well. For example:
- `msg` is acceptable in event callbacks but would be problematic in function parameters
- `data` is fine in `on('data', ...)` handlers but not as a generic function parameter
- Short iteration variables (`p`, `q`, `v`, `f`) are acceptable in tight loops with clear context

The audit should analyze usage context (scope size, naming patterns nearby, established conventions) rather than relying on fixed lists. This approach:
- Adapts to project conventions automatically
- Reduces false positives in codebases with consistent patterns
- Provides more nuanced, actionable feedback than blanket rules

### Should the audit distinguish between different identifier types?

**Decision**: Option: Different rules for different contexts

**Rationale**: The codebase already demonstrates this pattern through its linting policy and conventions:
- Loop indices (`i`, `j`) are universally acceptable
- Sort comparators (`a`, `b`) are conventional
- Event handler parameters (`data`, `msg`) follow Node.js idioms
- Function parameters demand more descriptive names than local variables

Context-aware rules reduce noise and match developer expectations.

### How should the audit handle framework conventions?

**Decision**: Option: Detect framework and apply exceptions

**Rationale**: The dust codebase is TypeScript/Node.js-based and follows ecosystem conventions:
- Event handler patterns: `on('data', (data: Buffer) => ...)`
- Sort comparators: `sort((a, b) => ...)`
- Testing frameworks: expect, describe, it

Detecting these patterns and allowing conventional names (within those specific contexts) prevents noise while still catching genuine clarity issues. The audit should recognize common patterns from TypeScript, Node.js, and testing frameworks.

### Should the audit suggest specific renames?

**Decision**: Option: Suggest concrete alternatives

**Rationale**: Stock audits in dust already provide actionable suggestions (see ubiquitous-language, primitive-obsession audits). Concrete suggestions:
- Make findings actionable and educational
- Help developers understand what "more descriptive" means in context
- Speed up remediation by providing starting points

However, suggestions should be context-aware and conservative - when uncertain, suggest multiple alternatives or describe the pattern to improve without prescribing a specific name.

## Open Questions

### Should the audit have severity levels for different types of clarity issues?

#### Option: Categorize by impact

Classify findings as:
- **Critical**: Misleading names that don't match behavior, causing confusion
- **High**: Generic names in large scopes or public APIs, significantly harming readability
- **Medium**: Abbreviations or terse names in moderate scopes, somewhat unclear
- **Low**: Minor inconsistencies or style preferences

Pros: Helps prioritize remediation, distinguishes serious issues from nitpicks
Cons: Severity assessment is subjective, may add complexity

#### Option: Flat list of findings

Report all findings without severity levels, letting developers prioritize based on their context.

Pros: Simpler, avoids subjective severity judgments
Cons: Harder to prioritize, may bury important issues in minor findings

### How should the audit handle widely-accepted abbreviations in specific domains?

#### Option: Maintain a domain-specific allowlist

Build patterns for common domains and their abbreviations:
- HTTP: `req`, `res` (though already banned by linting policy)
- UI: `btn`, `elem`, `attr`
- Config: `cfg`, `env`
- Database: `db`, `conn`, `tx`

Pros: Recognizes domain conventions, reduces false positives
Cons: Requires maintaining domain knowledge, may become outdated

#### Option: Context inference only

Don't maintain domain lists; instead infer acceptability from immediate context (file name, surrounding code, variable usage).

Pros: No maintenance burden, adapts to any domain
Cons: May miss domain-specific patterns, harder to implement

### Should the audit check test files differently than source files?

#### Option: Relaxed rules for test files

Apply more lenient naming standards in `.test.ts` files, allowing terser names in setup/assertion code.

Pros: Matches testing conventions where brevity often aids readability
Cons: May allow unclear test names that harm maintainability

#### Option: Consistent rules across all file types

Apply the same naming clarity standards to both source and test files.

Pros: Consistent expectations, tests are code too
Cons: May flag acceptable testing patterns (e.g., `actual`, `expected`, `sut`)
