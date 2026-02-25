# Audit: Global State

Find global state and singletons that introduce hidden coupling and hurt testability.

Review existing ideas in `./.dust/ideas/` to understand what has been proposed or considered historically, then create new idea files in `./.dust/ideas/` for any issues you identify, avoiding duplication.

## Scope

Focus on these patterns:

1. **Module-level mutable variables** - Variables declared outside functions that can be modified
2. **Singleton patterns** - Classes or objects that enforce a single instance (getInstance, static instance fields)
3. **Global registries** - Maps, arrays, or sets that accumulate state across module loads
4. **Implicit dependencies** - Functions that read from or write to module-level state instead of using parameters
5. **Shared configuration objects** - Mutable config objects imported and modified by multiple modules
6. **Lazy initialization with caching** - Values computed once and stored at module level

## Analysis Steps

1. Search for `let` and `var` declarations at module level (outside functions/classes)
2. Look for singleton patterns: `getInstance`, `static instance`, `export const instance`
3. Find module-level `Map`, `Set`, `Array`, or `Object` that gets modified
4. Identify functions that reference module-level variables not passed as parameters
5. Check for `process.env` access scattered throughout the codebase instead of centralized

## Output

For each global state instance identified, provide:
- **Location** - File path and line number
- **Pattern** - Which category (mutable variable, singleton, registry, etc.)
- **Impact** - How this affects testability or coupling (e.g., "Tests must reset this state", "Cannot run tests in parallel")
- **Suggestion** - How to refactor (e.g., "Pass as dependency", "Use factory function", "Move to function scope")

## Principles

- [Dependency Injection](../principles/dependency-injection.md) - Dependencies should be passed in, not accessed globally
- [Decoupled Code](../principles/decoupled-code.md) - Code should be organized into independent units
- [Test Isolation](../principles/test-isolation.md) - Tests should not affect each other

## Blocked By

(none)

## Definition of Done

- [ ] Searched for module-level mutable variables (let/var outside functions)
- [ ] Identified singleton patterns and getInstance methods
- [ ] Found global registries (Maps, Sets, Arrays modified at module level)
- [ ] Located functions with implicit dependencies on module-level state
- [ ] Checked for scattered process.env access
- [ ] Documented impact of each global state instance on testing
- [ ] Proposed ideas for refactoring global state to explicit dependencies