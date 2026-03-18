# Audit: Documentation Drift

Review code documentation for accuracy against current implementation.

Review existing ideas in `./.dust/ideas/` to understand what has been proposed or considered historically, then create new idea files in `./.dust/ideas/` for any issues you identify, avoiding duplication.

## Context

Code-level documentation (JSDoc, README sections, inline comments) can drift from reality over time. Outdated docs mislead agents who may trust incorrect parameter descriptions, wrong return types, or stale code examples. This audit complements the facts-verification audit by focusing on code-level documentation rather than `.dust/facts/`.

## Scope

Focus on these areas:

1. **JSDoc descriptions** - Check if function descriptions match actual behavior
2. **Parameter documentation** - Identify docs for removed or renamed parameters
3. **Return type documentation** - Find return type docs that contradict actual types
4. **README code examples** - Verify that code examples compile and run
5. **Inline comments** - Review comments describing code that has changed

## Analysis Steps

### 1. JSDoc Description Accuracy

For key functions with JSDoc comments:
1. Read the JSDoc `@description` or opening sentence
2. Read the function implementation
3. Flag cases where the description doesn't match what the function actually does
4. Common drift patterns: descriptions that mention removed features, describe old algorithms, or omit new behavior

### 2. Parameter Documentation

For functions with `@param` documentation:
1. List all documented parameters
2. List all actual function parameters
3. Flag documented parameters that don't exist in the function signature
4. Flag actual parameters missing from documentation (if the function has any `@param` docs)

### 3. Return Type Documentation

For functions with `@returns` or `@return` documentation:
1. Read the documented return type and description
2. Check the actual return type (TypeScript type or inferred from implementation)
3. Flag mismatches between documented and actual return types
4. Flag return descriptions that don't match actual return behavior

### 4. README Code Examples

For code blocks in README.md and other documentation:
1. Extract code examples that appear to be runnable (not pseudocode)
2. Check if imports/requires reference files or modules that exist
3. Check if function calls use correct signatures
4. Flag examples that reference renamed or removed APIs

### 5. Inline Comment Review

For inline comments that describe specific code behavior:
1. Read the comment
2. Read the adjacent code
3. Flag comments where the described behavior doesn't match the implementation
4. Common patterns: "TODO" comments for work that's done, "HACK" comments for code that's been cleaned up

## Output

For each drift found, document:

- **Location** - File path and line number
- **What the documentation claims** - Quote or summarize the documentation
- **What the code actually does** - Describe the actual behavior
- **Suggested fix** - One of:
  - `update` - Update the documentation to match the code
  - `remove` - Remove stale documentation entirely
  - `add` - Add missing documentation (only if partial docs exist)

Example findings:

```markdown
### lib/parser.ts:42 - JSDoc description drift

- **Documentation claims**: "Parses the input string and returns an AST with source locations"
- **Code actually does**: Returns an AST without source locations (that feature was removed)
- **Fix**: update - Remove "with source locations" from the description

### README.md:156 - Stale code example

- **Documentation claims**: `import { parseFile } from './lib/parser'`
- **Code actually does**: `parseFile` was renamed to `parse`
- **Fix**: update - Change import to `import { parse } from './lib/parser'`

### lib/utils.ts:89 - Outdated inline comment

- **Documentation claims**: "// HACK: workaround for Node 14 bug"
- **Code actually does**: Clean implementation with no workaround; min Node version is now 18
- **Fix**: remove - Delete the obsolete comment
```

## Principles

- [Agent Autonomy](../principles/agent-autonomy.md) - Accurate documentation enables agents to work without trial and error
- [Context Window Efficiency](../principles/context-window-efficiency.md) - Incorrect docs waste context on misleading information
- [Maintainable Codebase](../principles/maintainable-codebase.md) - Up-to-date documentation reduces maintenance burden

## Blocked By

(none)

## Definition of Done

- [ ] Reviewed JSDoc descriptions for accuracy against function behavior
- [ ] Checked parameter documentation for removed or renamed parameters
- [ ] Verified return type documentation matches actual return types
- [ ] Tested README code examples for correctness (imports, function signatures)
- [ ] Reviewed inline comments for outdated descriptions
- [ ] Documented each drift finding with location, claim, reality, and suggested fix
- [ ] Created ideas for any substantial documentation updates needed