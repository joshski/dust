/**
 * Stock audit templates as type-safe functions.
 *
 * Users can override any of these by placing a file with the same name
 * in .dust/config/audits/.
 */

import { dedent } from '../cli/dedent'
import { extractOpeningSentence } from '../markdown/markdown-utilities'

export interface StockAudit {
  name: string
  description: string
  template: string
}

function agentDeveloperExperience(): string {
  return dedent`
    # Agent Developer Experience

    Review the codebase to ensure agents have everything they need to operate effectively. Review existing ideas in \`./.ideas/\` and the recent history of \`./.dust/ideas\` to understand what has been proposed or considered historically, then create new idea files in \`./.ideas/\` for any issues you identify, avoiding duplication.

    ## Scope

    Focus on these areas:

    1. **Context window efficiency** - Are files small and well-organized?
    2. **Test coverage** - Can agents verify correctness through tests?
    3. **Feedback loop speed** - How fast are checks and tests?
    4. **Debugging tools** - Can agents diagnose issues without trial and error?
    5. **Structured logging** - Is system behavior observable through logs?

    ## Goals

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

    Find and remove unused code to improve maintainability and reduce bundle size. Review existing ideas in \`./.ideas/\` and the recent history of \`./.dust/ideas\` to understand what has been proposed or considered historically, then create new idea files in \`./.ideas/\` for any issues you identify, avoiding duplication.

    ## Scope

    Focus on these areas:

    1. **Unused exports** - Functions, classes, constants that are never imported
    2. **Unreachable code** - Code after return statements, impossible conditions
    3. **Orphaned files** - Files that are not imported anywhere
    4. **Unused dependencies** - Packages in package.json not used in code
    5. **Commented-out code** - Old code left in comments

    ## Goals

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

    Review \`.dust/facts/\` to ensure documented facts match current reality. Review existing ideas in \`./.ideas/\` and the recent history of \`./.dust/ideas\` to understand what has been proposed or considered historically, then create new idea files in \`./.ideas/\` for any issues you identify, avoiding duplication.

    ## Scope

    Focus on these areas:

    1. **Accuracy** - Do documented facts reflect the current codebase?
    2. **Completeness** - Are important implementation details documented?
    3. **Staleness** - Have facts become outdated due to recent changes?
    4. **Relevance** - Are all facts still useful for understanding the project?

    ## Goals

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

    Review recent commit history to identify follow-up improvement ideas. Review existing ideas in \`./.ideas/\` and the recent history of \`./.dust/ideas\` to understand what has been proposed or considered historically, then create new idea files in \`./.ideas/\` for any issues or opportunities you identify, avoiding duplication.

    ## Scope

    Focus on these areas:

    1. **Technical debt** - Did recent work introduce shortcuts?
    2. **Incomplete work** - Are there TODO comments or partial implementations?
    3. **Pattern opportunities** - Can recent changes be generalized?
    4. **Test gaps** - Do recent changes have adequate test coverage?

    ## Goals

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

function ideasFromGoals(): string {
  return dedent`
    # Ideas from Goals

    Review \`.dust/goals/\` to generate new improvement ideas. Review existing ideas in \`./.ideas/\` and the recent history of \`./.dust/ideas\` to understand what has been proposed or considered historically, then create new idea files in \`./.ideas/\` for any issues or opportunities you identify, avoiding duplication.

    ## Scope

    Focus on these areas:

    1. **Unmet goals** - Which goals lack supporting work?
    2. **Gap analysis** - Where does the codebase fall short of goals?
    3. **New opportunities** - What work would better achieve each goal?
    4. **Goal alignment** - Are current tasks aligned with stated goals?

    ## Goals

    (none)

    ## Blocked By

    (none)

    ## Definition of Done

    - [ ] Read each goal file in \`.dust/goals/\`
    - [ ] Analyzed codebase for alignment with each goal
    - [ ] Listed gaps between current state and goal intent
    - [ ] Proposed new ideas for unmet or underserved goals
  `
}

function performanceReview(): string {
  return dedent`
    # Performance Review

    Review the application for performance issues and optimization opportunities. Review existing ideas in \`./.ideas/\` and the recent history of \`./.dust/ideas\` to understand what has been proposed or considered historically, then create new idea files in \`./.ideas/\` for any issues you identify, avoiding duplication.

    ## Scope

    Focus on these areas:

    1. **Startup time** - How fast does the application start?
    2. **Command latency** - How responsive are CLI commands?
    3. **Memory usage** - Is memory being used efficiently?
    4. **Build performance** - How fast is the build process?
    5. **Test speed** - Are tests running efficiently?

    ## Goals

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

    Review the codebase for common security vulnerabilities and misconfigurations. Review existing ideas in \`./.ideas/\` and the recent history of \`./.dust/ideas\` to understand what has been proposed or considered historically, then create new idea files in \`./.ideas/\` for any issues you identify, avoiding duplication.

    ## Scope

    Focus on these areas:

    1. **Hardcoded secrets** - API keys, passwords, tokens in source code
    2. **Injection vulnerabilities** - SQL injection, command injection, XSS
    3. **Authentication issues** - Weak password handling, missing auth checks
    4. **Sensitive data exposure** - Logging sensitive data, insecure storage
    5. **Dependency vulnerabilities** - Known CVEs in dependencies

    ## Goals

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

    Review \`.dust/ideas/\` to identify ideas that have become stale or irrelevant. Review existing ideas in \`./.ideas/\` and the recent history of \`./.dust/ideas\` to understand what has been proposed or considered historically, then create new idea files in \`./.ideas/\` for any issues you identify, avoiding duplication.

    ## Scope

    Focus on these areas:

    1. **Age** - Ideas unchanged for many commits may need attention
    2. **Relevance** - Has the project evolved past the idea?
    3. **Actionability** - Can the idea be converted to a task?
    4. **Duplication** - Are there overlapping or redundant ideas?

    ## Goals

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

    Identify untested code paths and areas that need additional test coverage. Review existing ideas in \`./.ideas/\` and the recent history of \`./.dust/ideas\` to understand what has been proposed or considered historically, then create new idea files in \`./.ideas/\` for any issues you identify, avoiding duplication.

    ## Scope

    Focus on these areas:

    1. **Core business logic** - Functions that handle critical operations
    2. **Edge cases** - Boundary conditions, error handling paths
    3. **Integration points** - API endpoints, database operations
    4. **User-facing features** - UI components, form validation
    5. **Recent changes** - Code modified in the last few commits

    ## Goals

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

const stockAuditFunctions: Record<string, () => string> = {
  'agent-developer-experience': agentDeveloperExperience,
  'dead-code': deadCode,
  'facts-verification': factsVerification,
  'ideas-from-commits': ideasFromCommits,
  'ideas-from-goals': ideasFromGoals,
  'performance-review': performanceReview,
  'security-review': securityReview,
  'stale-ideas': staleIdeas,
  'test-coverage': testCoverage,
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
