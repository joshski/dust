/**
 * Stock audit templates as type-safe functions.
 *
 * Users can override any of these by placing a file with the same name
 * in .dust/config/audits/.
 */

import { dedent } from '../cli/dedent'
import { extractOpeningSentence } from '../markdown/markdown-utilities'

interface StockAudit {
  name: string
  description: string
  template: string
}

const ideasHint =
  'Review existing ideas in `./.dust/ideas/` to understand what has been proposed or considered historically, then create new idea files in `./.dust/ideas/` for any issues you identify, avoiding duplication.'

function dataAccessReview(): string {
  return dedent`
    # Data Access Review

    Review data access patterns for performance issues and optimization opportunities.

    ${ideasHint}

    ## Scope

    Focus on these areas:

    1. **N+1 query patterns** - Loops that make individual data requests instead of batching
    2. **Missing indexes** - Database schema files lacking indexes on frequently queried columns
    3. **Inefficient data loading** - Over-fetching (loading more data than needed) or under-fetching (requiring multiple round trips)
    4. **Caching opportunities** - Repeated lookups that could benefit from memoization or caching
    5. **Batch processing** - Sequential operations that could be parallelized or batched
    6. **Connection management** - Connection pooling configuration and resource cleanup

    ## Analysis Steps

    1. Search for loops containing data access calls (API requests, database queries, file reads)
    2. Review database schema or migration files for index definitions
    3. Identify functions that make multiple related data requests
    4. Look for repeated identical lookups within the same request lifecycle
    5. Check for proper resource cleanup (connection closing, stream ending)

    ## Applicability

    This audit applies to codebases that interact with:
    - Databases (SQL, NoSQL, ORM queries)
    - External APIs (REST, GraphQL, gRPC)
    - File systems (reading/writing files)
    - Caches (Redis, Memcached, in-memory)

    If none of these apply, document that finding and skip the detailed analysis.

    ## Principles

    - [Decoupled Code](../principles/decoupled-code.md) - Data access should be isolated for testability
    - [Fast Feedback](../principles/fast-feedback.md) - Efficient data access enables faster feedback loops
    - [Maintainable Codebase](../principles/maintainable-codebase.md) - Good data patterns improve maintainability

    ## Blocked By

    (none)

    ## Definition of Done

    - [ ] Searched for N+1 query patterns (loops with data access)
    - [ ] Reviewed database schemas for missing indexes (if applicable)
    - [ ] Identified over-fetching or under-fetching patterns
    - [ ] Found repeated lookups that could be cached
    - [ ] Checked for sequential operations that could be batched
    - [ ] Verified connection/resource cleanup is handled properly
    - [ ] Proposed ideas for any data access improvements identified
  `
}

function coverageExclusions(): string {
  return dedent`
    # Coverage Exclusions

    Review coverage exclusion configuration to identify opportunities for removal through refactoring.

    ${ideasHint}

    ## Scope

    Focus on these areas:

    1. **Current exclusions** - Review all exclusions in \`vitest.config.ts\` or equivalent
    2. **Justification** - Is each exclusion still necessary?
    3. **Tooling limitations** - Can workarounds be found for coverage tool issues?
    4. **Decoupling opportunities** - Can excluded code be restructured to enable testing?
    5. **Entry point patterns** - Can hard-to-test entry points be decoupled from logic?

    ## Principles

    - [Decoupled Code](../principles/decoupled-code.md)
    - [Unit Test Coverage](../principles/unit-test-coverage.md)
    - [Comprehensive Test Coverage](../principles/comprehensive-test-coverage.md)
    - [Make Changes with Confidence](../principles/make-changes-with-confidence.md)

    ## Blocked By

    (none)

    ## Definition of Done

    - [ ] Identified all coverage exclusions in the project
    - [ ] Documented the reason each exclusion exists
    - [ ] Evaluated whether each exclusion is still necessary
    - [ ] Identified exclusions that could be removed through decoupling
    - [ ] Proposed ideas for refactoring where feasible
  `
}

function componentReuse(): string {
  return dedent`
    # Component Reuse

    Find repeated patterns and code that could be extracted into reusable components.

    ${ideasHint}

    ## Scope

    Focus on these areas:

    1. **Repeated patterns** - Similar code blocks that appear multiple times
    2. **Copy-pasted code** - Near-identical logic across different files
    3. **Parallel structures** - Code that handles similar cases with minor variations
    4. **Extraction opportunities** - Logic that could be unified without forcing unrelated concepts together

    ## Principles

    - [Reasonably DRY](../principles/reasonably-dry.md)
    - [Decoupled Code](../principles/decoupled-code.md)
    - [Maintainable Codebase](../principles/maintainable-codebase.md)

    ## Blocked By

    (none)

    ## Definition of Done

    - [ ] Searched for repeated patterns across the codebase
    - [ ] Identified copy-pasted or near-duplicate code
    - [ ] Evaluated each case for whether extraction would be beneficial
    - [ ] Considered whether similar code serves different purposes that may evolve independently
    - [ ] Proposed ideas only for extractions where duplication is truly about the same concept
  `
}

function agentDeveloperExperience(): string {
  return dedent`
    # Agent Developer Experience

    Review the codebase to ensure agents have everything they need to operate effectively.

    ${ideasHint}

    ## Scope

    Focus on these areas:

    1. **Context window efficiency** - Are files small and well-organized?
    2. **Test coverage** - Can agents verify correctness through tests?
    3. **Feedback loop speed** - How fast are checks and tests?
    4. **Debugging tools** - Can agents diagnose issues without trial and error?
    5. **Structured logging** - Is system behavior observable through logs?

    ## Principles

    (none)

    ## Blocked By

    (none)

    ## Definition of Done

    - [ ] Reviewed file sizes and organization for context window fit
    - [ ] Verified test coverage is sufficient for agent verification
    - [ ] Measured feedback loop speed (time from change to check result)
    - [ ] Confirmed debugging tools and structured logging are in place
    - [ ] Proposed ideas for any improvements identified
  `
}

function deadCode(): string {
  return dedent`
    # Dead Code

    Find and remove unused code to improve maintainability and reduce bundle size.

    ${ideasHint}

    ## Scope

    Focus on these areas:

    1. **Unused exports** - Functions, classes, constants that are never imported
    2. **Unreachable code** - Code after return statements, impossible conditions
    3. **Orphaned files** - Files that are not imported anywhere
    4. **Unused dependencies** - Packages in package.json not used in code
    5. **Commented-out code** - Old code left in comments

    ## Principles

    (none)

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
  `
}

function factsVerification(): string {
  return dedent`
    # Facts Verification

    Review \`.dust/facts/\` to ensure documented facts match current reality.

    ${ideasHint}

    ## Scope

    Focus on these areas:

    1. **Accuracy** - Do documented facts reflect the current codebase?
    2. **Completeness** - Are important implementation details documented?
    3. **Staleness** - Have facts become outdated due to recent changes?
    4. **Relevance** - Are all facts still useful for understanding the project?

    ## Principles

    (none)

    ## Blocked By

    (none)

    ## Definition of Done

    - [ ] Read each fact file in \`.dust/facts/\`
    - [ ] Verified each fact against current codebase
    - [ ] Identified outdated or inaccurate facts
    - [ ] Listed missing facts that would help agents
    - [ ] Updated or removed stale facts
    - [ ] Proposed ideas for any facts improvements needed
  `
}

function ideasFromCommits(): string {
  return dedent`
    # Ideas from Commits

    Review recent commit history to identify follow-up improvement ideas.

    ${ideasHint}

    ## Scope

    Focus on these areas:

    1. **Technical debt** - Did recent work introduce shortcuts?
    2. **Incomplete work** - Are there TODO comments or partial implementations?
    3. **Pattern opportunities** - Can recent changes be generalized?
    4. **Test gaps** - Do recent changes have adequate test coverage?

    ## Principles

    (none)

    ## Blocked By

    (none)

    ## Definition of Done

    - [ ] Reviewed commits from the last 20 commits
    - [ ] Identified patterns or shortcuts worth addressing
    - [ ] Listed TODO comments added in recent commits
    - [ ] Noted areas where changes could be generalized
    - [ ] Proposed follow-up ideas for any issues identified
  `
}

function ideasFromPrinciples(): string {
  return dedent`
    # Ideas from Principles

    Review \`.dust/principles/\` to generate new improvement ideas.

    ${ideasHint}

    ## Scope

    Focus on these areas:

    1. **Unmet principles** - Which principles lack supporting work?
    2. **Gap analysis** - Where does the codebase fall short of principles?
    3. **New opportunities** - What work would better achieve each principle?
    4. **Principle alignment** - Are current tasks aligned with stated principles?

    ## Principles

    (none)

    ## Blocked By

    (none)

    ## Definition of Done

    - [ ] Read each principle file in \`.dust/principles/\`
    - [ ] Analyzed codebase for alignment with each principle
    - [ ] Listed gaps between current state and principle intent
    - [ ] Proposed new ideas for unmet or underserved principles
  `
}

function refactoringOpportunities(): string {
  return dedent`
    # Refactoring Opportunities

    Analyze recent commits to identify code needing structural improvements.

    ${ideasHint}

    ## Scope

    Analyze commits since the last refactoring-opportunities audit (check \`.dust/done/\` for previous runs). Focus on these signals:

    1. **File churn** - Files modified frequently across multiple commits may have unclear responsibilities or be accumulating technical debt
    2. **Size growth** - Files that have grown significantly may benefit from decomposition
    3. **Commit message patterns** - Look for messages containing "fix", "workaround", "temporary", "hack", or "TODO" that indicate shortcuts taken

    ## Analysis Steps

    1. Run \`git log --since="<last-audit-date>" --name-only --pretty=format:"COMMIT:%s"\` to get commits with their messages and changed files
    2. Count file modification frequency to identify high-churn files
    3. Check current sizes of frequently-modified files with \`wc -l\`
    4. Review commit messages for patterns suggesting technical debt

    ## Output

    For each refactoring opportunity identified, provide:
    - **File path** - The specific file needing attention
    - **Signal** - What triggered this recommendation (churn, size, commit pattern)
    - **Specific suggestion** - A concrete refactoring action (e.g., "Extract the validation logic into a separate module", not just "consider refactoring")

    ## Principles

    - [Boy Scout Rule](../principles/boy-scout-rule.md) - Leave code better than found, but capture large cleanups as separate tasks
    - [Make the Change Easy](../principles/make-the-change-easy.md) - Refactor until the change becomes straightforward
    - [Make Changes with Confidence](../principles/make-changes-with-confidence.md) - Tests and checks enable safe refactoring
    - [Reasonably DRY](../principles/reasonably-dry.md) - Extract only when duplication represents the same concept

    ## Blocked By

    (none)

    ## Definition of Done

    - [ ] Identified high-churn files (modified in 3+ commits since last audit)
    - [ ] Flagged files exceeding 300 lines that grew significantly
    - [ ] Noted commits with concerning message patterns
    - [ ] Provided specific refactoring suggestions for each opportunity
    - [ ] Created ideas for any substantial refactoring work identified
  `
}

function performanceReview(): string {
  return dedent`
    # Performance Review

    Review the application for performance issues and optimization opportunities.

    ${ideasHint}

    ## Scope

    Focus on these areas:

    1. **Startup time** - How fast does the application start?
    2. **Command latency** - How responsive are CLI commands?
    3. **Memory usage** - Is memory being used efficiently?
    4. **Build performance** - How fast is the build process?
    5. **Test speed** - Are tests running efficiently?

    ## Principles

    (none)

    ## Blocked By

    (none)

    ## Definition of Done

    - [ ] Measured startup time for common commands
    - [ ] Profiled memory usage during typical operations
    - [ ] Identified slow commands or operations
    - [ ] Listed optimization opportunities by impact
    - [ ] Proposed ideas for any performance improvements identified
  `
}

function securityReview(): string {
  return dedent`
    # Security Review

    Review the codebase for common security vulnerabilities and misconfigurations.

    ${ideasHint}

    ## Scope

    Focus on these areas:

    1. **Hardcoded secrets** - API keys, passwords, tokens in source code
    2. **Injection vulnerabilities** - SQL injection, command injection, XSS
    3. **Authentication issues** - Weak password handling, missing auth checks
    4. **Sensitive data exposure** - Logging sensitive data, insecure storage
    5. **Dependency vulnerabilities** - Known CVEs in dependencies

    ## Principles

    (none)

    ## Blocked By

    (none)

    ## Definition of Done

    - [ ] Searched for hardcoded secrets (API keys, passwords, tokens)
    - [ ] Reviewed input validation and sanitization
    - [ ] Checked authentication and authorization logic
    - [ ] Verified sensitive data is not logged or exposed
    - [ ] Ran dependency audit for known vulnerabilities
    - [ ] Documented any findings with severity ratings
    - [ ] Proposed ideas for any security issues found
  `
}

function staleIdeas(): string {
  return dedent`
    # Stale Ideas

    Review \`.dust/ideas/\` to identify ideas that have become stale or irrelevant.

    ${ideasHint}

    ## Scope

    Focus on these areas:

    1. **Age** - Ideas unchanged for many commits may need attention
    2. **Relevance** - Has the project evolved past the idea?
    3. **Actionability** - Can the idea be converted to a task?
    4. **Duplication** - Are there overlapping or redundant ideas?

    ## Principles

    (none)

    ## Blocked By

    (none)

    ## Definition of Done

    - [ ] Listed all ideas with their last modification date
    - [ ] Identified ideas unchanged for 50+ commits
    - [ ] Reviewed each stale idea for current relevance
    - [ ] Promoted actionable ideas to tasks
    - [ ] Deleted ideas that are no longer relevant
  `
}

function testCoverage(): string {
  return dedent`
    # Test Coverage

    Identify untested code paths and areas that need additional test coverage.

    ${ideasHint}

    ## Scope

    Focus on these areas:

    1. **Core business logic** - Functions that handle critical operations
    2. **Edge cases** - Boundary conditions, error handling paths
    3. **Integration points** - API endpoints, database operations
    4. **User-facing features** - UI components, form validation
    5. **Recent changes** - Code modified in the last few commits

    ## Principles

    (none)

    ## Blocked By

    (none)

    ## Definition of Done

    - [ ] Identified modules with low or no test coverage
    - [ ] Listed critical paths that lack tests
    - [ ] Prioritized areas by risk and importance
    - [ ] Proposed ideas for any test coverage gaps identified
  `
}

function errorHandling(): string {
  return dedent`
    # Error Handling

    Review error handling patterns for consistency and agent-friendliness.

    ${ideasHint}

    ## Scope

    Focus on these areas:

    1. **Silently swallowed errors** - Empty catch blocks, \`.catch(() => {})\`, errors caught but not logged or re-thrown
    2. **Missing error context** - Errors converted to booleans or generic messages that lose details
    3. **Fire-and-forget promises** - Promises without \`.catch()\` or \`await\` that may fail silently
    4. **Non-actionable error messages** - Error messages that say what went wrong but not how to fix it
    5. **Inconsistent error recovery** - Similar error scenarios handled differently across the codebase

    ## Analysis Steps

    1. Search for empty catch blocks: \`catch {}\`, \`catch () {}\`, \`.catch(() => {})\`
    2. Look for patterns that discard error details: \`catch { return false }\`, \`catch { return null }\`
    3. Find promises without error handling: unassigned or not-awaited promises
    4. Review error messages in \`throw\` statements and \`context.stderr()\` calls for actionability
    5. Compare error handling patterns across similar operations for consistency

    ## Output

    For each error handling issue identified, provide:
    - **Location** - File path and line number
    - **Pattern** - Which category of issue (swallowed, missing context, fire-and-forget, etc.)
    - **Impact** - What failures could go unnoticed or be hard to debug
    - **Suggestion** - Specific fix (add logging, propagate error, add recovery guidance)

    ## Principles

    - [Actionable Errors](../principles/actionable-errors.md) - Error messages should tell you what to do next
    - [Debugging Tooling](../principles/debugging-tooling.md) - Agents need readable, structured error output
    - [Stop the Line](../principles/stop-the-line.md) - Problems should be fixed at source, not hidden

    ## Blocked By

    (none)

    ## Definition of Done

    - [ ] Searched for empty catch blocks and silent error swallowing
    - [ ] Identified patterns that discard error details
    - [ ] Found fire-and-forget promises without error handling
    - [ ] Reviewed error messages for actionability
    - [ ] Compared error handling consistency across similar operations
    - [ ] Proposed ideas for any error handling improvements identified
  `
}

function ubiquitousLanguage(): string {
  return dedent`
    # Ubiquitous Language

    Verify terminology consistency across code, documentation, and user interface.

    ${ideasHint}

    ## Scope

    Focus on these areas:

    1. **Terminology drift** - Do recent changes introduce terms that deviate from established vocabulary?
    2. **Code-to-docs alignment** - Are variables, functions, and types named consistently with documentation?
    3. **User interface consistency** - Do UI labels and messages match the terms used in code and docs?
    4. **Glossary adherence** - If a glossary exists, is it being followed?
    5. **Acronym and abbreviation usage** - Are shortened forms used consistently?

    ## Analysis Steps

    1. Identify key domain terms from documentation, README, or existing glossary
    2. Review recent commits for new terminology or naming choices
    3. Compare code identifiers against documented terminology
    4. Check user-facing strings for consistency with technical naming
    5. Flag deviations where the same concept uses different names

    ## Output

    For each terminology issue identified, provide:
    - **Term in question** - The inconsistent or unclear term
    - **Where found** - File paths and locations where the term appears
    - **Recommended action** - Standardize on existing term, or propose a new canonical name

    ## Principles

    - [Naming Matters](../principles/naming-matters.md) - Good naming reduces waste by eliminating confusion
    - [Consistent Naming](../principles/consistent-naming.md) - Names should follow established conventions
    - [Clarity Over Brevity](../principles/clarity-over-brevity.md) - Names should be descriptive and self-documenting

    ## Blocked By

    (none)

    ## Definition of Done

    - [ ] Identified key domain terms from project documentation
    - [ ] Reviewed recent commits for terminology consistency
    - [ ] Compared code naming against documentation vocabulary
    - [ ] Checked user-facing text for alignment with code terms
    - [ ] Documented any terminology drift or inconsistencies found
    - [ ] Proposed ideas for standardizing inconsistent terminology
  `
}

const stockAuditFunctions: Record<string, () => string> = {
  'agent-developer-experience': agentDeveloperExperience,
  'component-reuse': componentReuse,
  'coverage-exclusions': coverageExclusions,
  'data-access-review': dataAccessReview,
  'dead-code': deadCode,
  'error-handling': errorHandling,
  'facts-verification': factsVerification,
  'ideas-from-commits': ideasFromCommits,
  'ideas-from-principles': ideasFromPrinciples,
  'performance-review': performanceReview,
  'refactoring-opportunities': refactoringOpportunities,
  'security-review': securityReview,
  'stale-ideas': staleIdeas,
  'test-coverage': testCoverage,
  'ubiquitous-language': ubiquitousLanguage,
}

export function loadStockAudits(): StockAudit[] {
  return Object.entries(stockAuditFunctions)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, render]) => {
      const template = render()
      const description = extractOpeningSentence(template)
      return { name, description: description as string, template }
    })
}
