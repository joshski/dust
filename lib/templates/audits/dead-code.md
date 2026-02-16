# Dead Code

Find and remove unused code to improve maintainability and reduce bundle size. Review existing ideas in `./.ideas/` and the recent history of `./.dust/ideas` to understand what has been proposed or considered historically, then create new idea files in `./.ideas/` for any issues you identify, avoiding duplication.

## Scope

Focus on these areas:

1. **Unused exports** - Functions, classes, constants that are never imported
2. **Unreachable code** - Code after return statements, impossible conditions
3. **Orphaned files** - Files that are not imported anywhere
4. **Unused dependencies** - Packages in package.json not used in code
5. **Commented-out code** - Old code left in comments

## Blocked By

(none)

## Definition of Done

- [ ] Ran static analysis tools to find unused exports
- [ ] Identified files with no incoming imports
- [ ] Listed unused dependencies
- [ ] Reviewed commented-out code blocks
- [ ] Created list of code safe to remove
- [ ] Verified removal won't break dynamic imports or reflection
- [ ] Proposed ideas for any dead code worth removing
