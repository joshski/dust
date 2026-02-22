# Add Data Access Review Audit

Add a new stock audit for reviewing data access patterns in a codebase.

## Context

Stock audits live in `lib/audits/stock-audits.ts`. Each audit is a function that returns a markdown template. The audit should be general-purpose since not all repositories have databases, but data access patterns (API calls, file I/O, caching) are common in most applications.

## Implementation

Add a `dataAccessReview()` function to `lib/audits/stock-audits.ts` that covers:

1. **N+1 query patterns** - Look for loops that make individual data requests
2. **Missing indexes** - Check database schema files for indexing opportunities
3. **Inefficient data loading** - Identify over-fetching or under-fetching patterns
4. **Caching opportunities** - Find repeated lookups that could be cached
5. **Batch processing** - Identify sequential operations that could be batched
6. **Connection management** - Check for connection pooling and resource cleanup

The audit should:
- Not assume a database exists
- Cover general data access patterns (APIs, files, databases)
- Follow the existing audit template structure
- Include practical analysis steps

## Principles

- [Decoupled Code](../principles/decoupled-code.md) - Data access should be isolated for testability
- [Fast Feedback](../principles/fast-feedback.md) - Efficient data access enables faster feedback loops
- [Maintainable Codebase](../principles/maintainable-codebase.md) - Good data patterns improve maintainability

## Blocked By

(none)

## Definition of Done

- [ ] `dataAccessReview()` function added to `lib/audits/stock-audits.ts`
- [ ] Function registered in `stockAuditFunctions` object
- [ ] Audit follows existing template structure with ideasHint
- [ ] Tests pass
- [ ] Build succeeds
