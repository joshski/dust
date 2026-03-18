/**
 * Stock audit templates as type-safe functions.
 *
 * Users can override any of these by placing a file with the same name
 * in .dust/config/audits/.
 */

import { dedent } from '../cli/dedent'
import { extractOpeningSentence } from '../markdown/markdown-utilities'
import { checksAuditTemplate } from './checks-audit'

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

    ## Blocked By

    (none)

    ## Definition of Done

    - Searched for N+1 query patterns (loops with data access)
    - Reviewed database schemas for missing indexes (if applicable)
    - Identified over-fetching or under-fetching patterns
    - Found repeated lookups that could be cached
    - Checked for sequential operations that could be batched
    - Verified connection/resource cleanup is handled properly
    - Proposed ideas for any data access improvements identified
  `
}

function coverageExclusions(): string {
  return dedent`
    # Coverage Exclusions

    Audit all coverage exclusions to identify opportunities for removal through refactoring.

    ${ideasHint}

    ## Scope

    Search for exclusions in both configuration and source code:

    1. **Configuration-level exclusions** - Review test framework configuration for file/directory exclusion patterns
    2. **Inline escape directives** - Search for comments that exclude code from coverage (e.g., ignore directives in source files)
    3. **Test files** - Include test code in the search; inline directives may hide flaky or unclear test logic

    ## Analysis

    For each exclusion found:

    1. **Document the location** - File path and line number (or config section)
    2. **Identify the reason** - Why was this exclusion added?
    3. **Categorize by justification**:
       - Native wrapper (code that wraps platform APIs with no testable logic)
       - Defensive guard (unreachable error handling for type safety)
       - Integration boundary (code that requires external systems)
       - Tooling limitation (coverage tool bug or limitation)
       - Technical debt (code that should be testable but isn't)
       - Unknown (no clear justification found)
    4. **Label justification quality** - Is the justification well-documented, reasonable, or questionable?
    5. **Evaluate removal potential** - Can the exclusion be removed through decoupling or refactoring?

    ## Blocked By

    (none)

    ## Definition of Done

    - Identified all configuration-level coverage exclusions
    - Searched source and test files for inline escape directives
    - Documented the reason each exclusion exists
    - Categorized each exclusion by justification type
    - Labeled justification quality for visibility
    - Identified exclusions that could be removed through decoupling
    - Proposed ideas for refactoring where feasible
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

    ## Blocked By

    (none)

    ## Definition of Done

    - Searched for repeated patterns across the codebase
    - Identified copy-pasted or near-duplicate code
    - Evaluated each case for whether extraction would be beneficial
    - Considered whether similar code serves different purposes that may evolve independently
    - Proposed ideas only for extractions where duplication is truly about the same concept
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

    ## Blocked By

    (none)

    ## Definition of Done

    - Reviewed file sizes and organization for context window fit
    - Verified test coverage is sufficient for agent verification
    - Measured feedback loop speed (time from change to check result)
    - Confirmed debugging tools and structured logging are in place
    - Proposed ideas for any improvements identified
  `
}

function agentInstructionQuality(): string {
  return dedent`
    # Agent Instruction Quality

    Review agent instruction files (AGENTS.md, CLAUDE.md) for clarity and completeness.

    ${ideasHint}

    ## Context

    Agent instruction files directly impact agent effectiveness. Poor instructions lead to wasted context, confusion, and suboptimal decisions. This audit focuses on the instruction artifacts themselves.

    ## Scope

    Focus on these areas:

    1. **Contradictory instructions** - Find conflicting guidance across instruction files
    2. **Stale references** - Identify instructions that reference removed code or features
    3. **Missing context** - Detect areas where agents frequently need information not provided
    4. **Verbose instructions** - Flag overly long sections that waste context window space
    5. **Linter-replaceable rules** - Identify instructions that could be enforced by linter rules instead

    ## Analysis Steps

    ### 1. Locate Instruction Files

    Search for agent instruction files:
    - \`CLAUDE.md\` (Claude Code instructions)
    - \`AGENTS.md\` (general agent instructions)
    - \`.cursorrules\` (Cursor rules)
    - \`copilot-instructions.md\` (GitHub Copilot instructions)
    - Any other agent-specific configuration files

    ### 2. Check for Contradictory Instructions

    For each instruction file:
    1. Extract all directives, rules, and guidance statements
    2. Compare against directives in other instruction files
    3. Flag cases where:
       - One file says "always do X" and another says "never do X"
       - Instructions give conflicting guidance for the same scenario
       - Priority or ordering conflicts exist

    Example finding:
    \`\`\`markdown
    ### Contradiction: Commit message format
    - **CLAUDE.md:45** says "Use conventional commits (feat:, fix:, etc.)"
    - **AGENTS.md:23** says "Use imperative mood without prefixes"
    - **Impact**: Agents may produce inconsistent commit messages
    - **Suggestion**: Align both files on a single commit message convention
    \`\`\`

    ### 3. Detect Stale References

    For each instruction file:
    1. Extract references to files, functions, directories, or features
    2. Verify each reference exists in the codebase
    3. Flag references to:
       - Deleted or renamed files/directories
       - Removed functions, classes, or APIs
       - Deprecated features or workflows
       - Outdated tool names or commands

    Example finding:
    \`\`\`markdown
    ### Stale reference: src/legacy/parser.ts
    - **Location**: CLAUDE.md:78
    - **Instruction**: "Use the parser from src/legacy/parser.ts for..."
    - **Reality**: src/legacy/ directory was removed in commit abc123
    - **Impact**: Agents will fail to follow this instruction
    - **Suggestion**: Update to reference the new parser location
    \`\`\`

    ### 4. Identify Missing Context

    Review instruction files for gaps:
    1. Check if common agent tasks are covered (setup, testing, deployment)
    2. Look for areas where instructions assume knowledge not documented
    3. Identify patterns where agents might need guidance but none exists
    4. Consider what questions a new agent would have that aren't answered

    Signals of missing context:
    - Instructions reference concepts without explanation
    - Workflows have steps that require undocumented knowledge
    - Common failure modes have no troubleshooting guidance

    Example finding:
    \`\`\`markdown
    ### Missing context: Environment setup
    - **Gap**: No instructions for required environment variables
    - **Impact**: Agents may fail setup or produce incorrect configuration
    - **Suggestion**: Add section documenting required env vars and their purpose
    \`\`\`

    ### 5. Flag Verbose Sections

    Analyze instruction file sections for efficiency:
    1. Measure section lengths (line count, word count)
    2. Flag sections over 50 lines that could be condensed
    3. Identify redundant explanations or excessive examples
    4. Look for sections that repeat information found elsewhere

    Verbosity signals:
    - Multiple examples where one would suffice
    - Lengthy explanations of concepts that could be linked
    - Repeated disclaimers or caveats
    - Inline documentation that duplicates code comments

    Example finding:
    \`\`\`markdown
    ### Verbose: Testing guidelines
    - **Location**: CLAUDE.md:120-220 (100 lines)
    - **Issue**: Includes 15 code examples; 3 would suffice
    - **Context cost**: ~2000 tokens that could be reclaimed
    - **Suggestion**: Condense to key patterns, link to test files for examples
    \`\`\`

    ### 6. Find Linter-Replaceable Rules

    Identify instructions that describe rules enforceable by static analysis:
    1. Search for instructions about code formatting (spacing, quotes, semicolons)
    2. Look for naming convention rules (camelCase, PascalCase, etc.)
    3. Find import ordering or organization requirements
    4. Identify type annotation requirements

    For each candidate:
    - Verify whether an ESLint, Biome, or similar rule exists
    - Check if the rule is already configured in the project
    - If not configured, recommend adding the linter rule

    Example finding:
    \`\`\`markdown
    ### Linter-replaceable: Import ordering
    - **Location**: CLAUDE.md:34
    - **Instruction**: "Always order imports: external, then internal, then relative"
    - **Linter rule**: \`import/order\` or \`@ianvs/prettier-plugin-sort-imports\`
    - **Current state**: Not configured in .eslintrc
    - **Suggestion**: Add linter rule to enforce automatically
    \`\`\`

    ## Output

    For each issue found, document:
    - **Location** - File path and section/line number
    - **Type** - One of: contradictory, stale, missing, verbose, linter-replaceable
    - **Impact** - How this affects agent effectiveness
    - **Suggested improvement** - Specific fix or action

    ## Blocked By

    (none)

    ## Definition of Done

    - [ ] Located all agent instruction files in the repository
    - [ ] Reviewed for contradictory instructions across files
    - [ ] Checked all file/code references for staleness
    - [ ] Identified gaps where context is missing
    - [ ] Flagged verbose sections that waste context window space
    - [ ] Found instructions that could be replaced by linter rules
    - [ ] Documented each issue with location, type, impact, and suggestion
    - [ ] Created ideas for substantial instruction improvements
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

    ## Blocked By

    (none)

    ## Definition of Done

    - Ran static analysis tools to find unused exports
    - Identified files with no incoming imports
    - Listed unused dependencies
    - Reviewed commented-out code blocks
    - Created list of code safe to remove
    - Verified removal won't break dynamic imports or reflection
    - Proposed ideas for any dead code worth removing
  `
}

function documentationDrift(): string {
  return dedent`
    # Documentation Drift

    Review code documentation for accuracy against current implementation.

    ${ideasHint}

    ## Context

    Code-level documentation (JSDoc, README sections, inline comments) can drift from reality over time. Outdated docs mislead agents who may trust incorrect parameter descriptions, wrong return types, or stale code examples. This audit complements the facts-verification audit by focusing on code-level documentation rather than \`.dust/facts/\`.

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
    1. Read the JSDoc \`@description\` or opening sentence
    2. Read the function implementation
    3. Flag cases where the description doesn't match what the function actually does
    4. Common drift patterns: descriptions that mention removed features, describe old algorithms, or omit new behavior

    ### 2. Parameter Documentation

    For functions with \`@param\` documentation:
    1. List all documented parameters
    2. List all actual function parameters
    3. Flag documented parameters that don't exist in the function signature
    4. Flag actual parameters missing from documentation (if the function has any \`@param\` docs)

    ### 3. Return Type Documentation

    For functions with \`@returns\` or \`@return\` documentation:
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
      - \`update\` - Update the documentation to match the code
      - \`remove\` - Remove stale documentation entirely
      - \`add\` - Add missing documentation (only if partial docs exist)

    Example findings:

    \`\`\`markdown
    ### lib/parser.ts:42 - JSDoc description drift

    - **Documentation claims**: "Parses the input string and returns an AST with source locations"
    - **Code actually does**: Returns an AST without source locations (that feature was removed)
    - **Fix**: update - Remove "with source locations" from the description

    ### README.md:156 - Stale code example

    - **Documentation claims**: \`import { parseFile } from './lib/parser'\`
    - **Code actually does**: \`parseFile\` was renamed to \`parse\`
    - **Fix**: update - Change import to \`import { parse } from './lib/parser'\`

    ### lib/utils.ts:89 - Outdated inline comment

    - **Documentation claims**: "// HACK: workaround for Node 14 bug"
    - **Code actually does**: Clean implementation with no workaround; min Node version is now 18
    - **Fix**: remove - Delete the obsolete comment
    \`\`\`

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
  `
}

function factsVerification(): string {
  return dedent`
    # Facts Verification

    Review \`.dust/facts/\` to ensure documented facts match current reality.

    ${ideasHint}

    ## Applicability

    If \`.dust/facts/\` does not exist or is empty, document that finding and skip the detailed analysis.

    ## Scope

    Focus on these areas:

    1. **Accuracy** - Do documented facts reflect the current codebase?
    2. **Completeness** - Are important implementation details documented?
    3. **Staleness** - Have facts become outdated due to recent changes?
    4. **Relevance** - Are all facts still useful for understanding the project?

    ## Blocked By

    (none)

    ## Definition of Done

    - Read each fact file in \`.dust/facts/\`
    - Verified each fact against current codebase
    - Identified outdated or inaccurate facts
    - Listed missing facts that would help agents
    - Updated or removed stale facts
    - Proposed ideas for any facts improvements needed
  `
}

function feedbackLoopSpeed(): string {
  return dedent`
    # Feedback Loop Speed

    Measure and report on check/test execution times to identify bottlenecks.

    ${ideasHint}

    ## Context

    The [Fast Feedback Loops](../principles/fast-feedback-loops.md) principle emphasizes that the primary feedback loop—write code, run checks, see results—should be as fast as possible. Agents especially benefit because they operate in tight loops of change-and-verify; slow feedback wastes tokens and context window space on waiting rather than working.

    This audit focuses specifically on measuring the development feedback loop speed to help identify which checks consume the most time.

    ## Scope

    Measure timing data for each component of the feedback loop:

    1. **\`dust check\` total time** - Aggregate time for all checks
    2. **Per-check breakdown** - Time spent on each individual check configured in \`dust check\`
    3. **Test suite execution time** - Total time and identification of slowest individual tests
    4. **Type checking duration** - Time spent on TypeScript/type checking
    5. **Linting duration** - Time spent on lint checks
    6. **Build time** - Time to compile/bundle if applicable

    ## Analysis Steps

    ### 1. Measure \`dust check\` Timing

    Run \`dust check\` and capture timing for each check:

    \`\`\`bash
    time bin/dust check
    \`\`\`

    Alternatively, if the output shows timing per check, extract those values.

    ### 2. Measure Test Suite Timing

    1. Identify the test framework used in this project (examine build config, test config files, or CI configuration)
    2. Run the test suite with verbose/timing output enabled (most frameworks support this)
    3. Extract per-test duration data from the output
    4. Identify the slowest individual tests by duration

    ### 3. Measure Type Checking Duration

    1. Identify the type checking tool used (examine build config or CI configuration)
    2. Run the type checker and capture execution time using \`time\` or similar

    ### 4. Measure Linting Duration

    1. Identify the linting tools configured for this project
    2. Run the linter and capture execution time using \`time\` or similar

    ### 5. Measure Build Time (if applicable)

    1. Identify the build command for this project (examine package.json scripts, Makefile, or CI configuration)
    2. Run the build and capture execution time using \`time\` or similar

    ### 6. Calculate Time Distribution

    For each check, calculate:
    - Absolute duration (seconds)
    - Percentage of total \`dust check\` time
    - Flag checks consuming >30% of total time as dominant

    ## Output

    Report timing data in a structured format:

    ### Summary

    | Check | Duration | % of Total |
    |-------|----------|------------|
    | lint | 2.1s | 12% |
    | typecheck | 4.5s | 26% |
    | tests | 8.3s | 48% |
    | build | 2.4s | 14% |
    | **Total** | **17.3s** | **100%** |

    ### Dominant Checks

    Flag any check that consumes a disproportionate amount of time (>30% of total):

    - **tests** (48% of total) - Consider investigating slow tests
    - See the \`slow-tests\` audit for detailed test timing analysis

    ### Slowest Individual Tests

    List the top 5 slowest tests:

    | Test | Duration |
    |------|----------|
    | "integration: full workflow" | 3.2s |
    | "parses large file" | 1.8s |
    | ... | ... |

    ## Interpretation Guidelines

    This audit reports raw timing data without prescribing specific thresholds. Different projects have different acceptable speeds depending on:

    - Codebase size
    - Team workflow (local vs CI-heavy)
    - Test strategy (unit-heavy vs integration-heavy)

    Use the data to:
    - Identify which checks to optimize first
    - Track feedback loop speed over time
    - Make informed decisions about parallelization or caching

    ## Blocked By

    (none)

    ## Definition of Done

    - [ ] Measured total \`dust check\` execution time
    - [ ] Measured time for each individual check (lint, typecheck, tests, build, etc.)
    - [ ] Identified test suite total execution time
    - [ ] Identified slowest individual tests (top 5)
    - [ ] Calculated percentage of total time for each check
    - [ ] Flagged dominant checks (>30% of total time)
    - [ ] Documented findings in summary table format
    - [ ] Created ideas for any feedback loop speed improvements identified
  `
}

function ideasFromPrinciples(): string {
  return dedent`
    # Ideas from Principles

    Review \`.dust/principles/\` to generate new improvement ideas.

    ${ideasHint}

    ## Applicability

    If \`.dust/principles/\` does not exist or is empty, document that finding and skip the detailed analysis.

    ## Scope

    Focus on these areas:

    1. **Unmet principles** - Which principles lack supporting work?
    2. **Gap analysis** - Where does the codebase fall short of principles?
    3. **New opportunities** - What work would better achieve each principle?
    4. **Principle alignment** - Are current tasks aligned with stated principles?

    ## Blocked By

    (none)

    ## Definition of Done

    - Read each principle file in \`.dust/principles/\`
    - Analyzed codebase for alignment with each principle
    - Listed gaps between current state and principle intent
    - Proposed new ideas for unmet or underserved principles
  `
}

function commitReview(): string {
  return dedent`
    # Commit Review

    Analyze recent commits to identify refactoring opportunities and improvement ideas.

    ${ideasHint}

    ## Scope

    Analyze commits since the last commit-review audit (check \`.dust/done/\` for previous runs). Focus on these signals:

    1. **File churn** - Files modified frequently across multiple commits may have unclear responsibilities or be accumulating technical debt
    2. **Size growth** - Files that have grown significantly may benefit from decomposition
    3. **Commit message patterns** - Look for messages containing "fix", "workaround", "temporary", "hack", or "TODO" that indicate shortcuts taken
    4. **Technical debt** - Did recent work introduce shortcuts?
    5. **Incomplete work** - Are there TODO comments or partial implementations?
    6. **Pattern opportunities** - Can recent changes be generalized?
    7. **Test gaps** - Do recent changes have adequate test coverage?

    ## Analysis Steps

    1. Run \`git log --since="<last-audit-date>" --name-only --pretty=format:"COMMIT:%s"\` to get commits with their messages and changed files
    2. Count file modification frequency to identify high-churn files
    3. Check current sizes of frequently-modified files with \`wc -l\`
    4. Review commit messages for patterns suggesting technical debt
    5. Review TODO comments added in recent commits
    6. Note areas where changes could be generalized

    ## Output

    For each opportunity identified, provide:
    - **File path** - The specific file needing attention
    - **Signal** - What triggered this recommendation (churn, size, commit pattern, incomplete work, test gap)
    - **Specific suggestion** - A concrete action (e.g., "Extract the validation logic into a separate module", not just "consider refactoring")

    ## Blocked By

    (none)

    ## Definition of Done

    - Reviewed commits since last audit (or last 20 commits if no prior audit)
    - Identified high-churn files (modified in 3+ commits since last audit)
    - Flagged files exceeding 300 lines that grew significantly
    - Noted commits with concerning message patterns
    - Listed TODO comments added in recent commits
    - Noted areas where changes could be generalized
    - Provided specific suggestions for each opportunity
    - Created ideas for any substantial work identified
  `
}

function securityReview(): string {
  return dedent`
    # Security Review

    Verify security tooling is configured and suggest missing tools.

    ${ideasHint}

    ## Scope

    Manual vulnerability scanning is unreliable — an agent reporting "no issues found" doesn't mean the code is secure. Instead, verify that dedicated security tools are configured and create ideas to add any that are missing.

    ### 1. Dependency Vulnerability Scanning

    Check for one of:
    - Package manager audit commands in CI (most package managers include vulnerability scanning)
    - Dependabot, Renovate, or similar configured for security updates
    - Snyk, Trivy, or similar security scanning integration

    ### 2. Secret Detection

    Check for one of:
    - \`gitleaks\` configured in CI or pre-commit hooks
    - \`trufflehog\` scanning git history
    - GitHub secret scanning enabled (for GitHub repos)

    ### 3. Static Analysis for Security

    Check for one of:
    - \`semgrep\` with security rules configured
    - Language-specific security linters (most ecosystems have them)
    - IDE or CI security scanning integrations

    ### 4. Supply Chain Security

    Check for one of:
    - Supply chain security tools configured for the project's package manager
    - Package lockfile integrity checks in CI
    - Dependency review workflows or trusted registry configurations

    ### 5. Lightweight Pattern Scan (Supplementary)

    As a supplement to proper tooling (not a replacement), grep for obvious issues:
    - Common secret patterns: \`sk-\`, \`AKIA\`, \`ghp_\`, \`Bearer \`
    - Hardcoded credentials: \`password = "\`, \`apiKey = "\`, \`secret = "\`
    - Unsafe patterns: \`eval(\`, \`dangerouslySetInnerHTML\`, \`exec(\`

    Note: This scan is non-exhaustive. Proper tooling catches far more issues.

    ## Blocked By

    (none)

    ## Definition of Done

    - [ ] Checked CI configuration for dependency vulnerability scanning
    - [ ] Checked for secret detection tooling (CI, pre-commit, or platform-native)
    - [ ] Checked for security-focused static analysis
    - [ ] Checked for supply chain security measures
    - [ ] Ran lightweight pattern scan for obvious issues (documented as supplementary)
    - [ ] Created ideas for any missing security tooling categories
    - [ ] Each idea specifies which tool to add and where to configure it
  `
}

function staleIdeas(): string {
  return dedent`
    # Stale Ideas

    Review \`.dust/ideas/\` to identify ideas that have become stale or irrelevant.

    ${ideasHint}

    ## Applicability

    If \`.dust/ideas/\` does not exist or is empty, document that finding and skip the detailed analysis.

    ## Scope

    Focus on these areas:

    1. **Age** - Ideas unchanged for many commits may need attention
    2. **Relevance** - Has the project evolved past the idea?
    3. **Actionability** - Can the idea be converted to a task?
    4. **Duplication** - Are there overlapping or redundant ideas?

    ## Blocked By

    (none)

    ## Definition of Done

    - Listed all ideas with their last modification date
    - Identified ideas unchanged for 50+ commits
    - Reviewed each stale idea for current relevance
    - Promoted actionable ideas to tasks
    - Deleted ideas that are no longer relevant
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

    ## Blocked By

    (none)

    ## Definition of Done

    - Searched for empty catch blocks and silent error swallowing
    - Identified patterns that discard error details
    - Found fire-and-forget promises without error handling
    - Reviewed error messages for actionability
    - Compared error handling consistency across similar operations
    - Proposed ideas for any error handling improvements identified
  `
}

function globalState(): string {
  return dedent`
    # Global State

    Find global state and singletons that introduce hidden coupling and hurt testability.

    ${ideasHint}

    ## Scope

    Focus on these patterns:

    1. **Module-level mutable variables** - Variables declared outside functions that can be modified
    2. **Singleton patterns** - Classes or objects that enforce a single instance (getInstance, static instance fields)
    3. **Global registries** - Maps, arrays, or sets that accumulate state across module loads
    4. **Implicit dependencies** - Functions that read from or write to module-level state instead of using parameters
    5. **Shared configuration objects** - Mutable config objects imported and modified by multiple modules
    6. **Lazy initialization with caching** - Values computed once and stored at module level

    ## Analysis Steps

    1. Search for \`let\` and \`var\` declarations at module level (outside functions/classes)
    2. Look for singleton patterns: \`getInstance\`, \`static instance\`, \`export const instance\`
    3. Find module-level \`Map\`, \`Set\`, \`Array\`, or \`Object\` that gets modified
    4. Identify functions that reference module-level variables not passed as parameters
    5. Check for \`process.env\` access scattered throughout the codebase instead of centralized

    ## Output

    For each global state instance identified, provide:
    - **Location** - File path and line number
    - **Pattern** - Which category (mutable variable, singleton, registry, etc.)
    - **Impact** - How this affects testability or coupling (e.g., "Tests must reset this state", "Cannot run tests in parallel")
    - **Suggestion** - How to refactor (e.g., "Pass as dependency", "Use factory function", "Move to function scope")

    ## Blocked By

    (none)

    ## Definition of Done

    - Searched for module-level mutable variables (let/var outside functions)
    - Identified singleton patterns and getInstance methods
    - Found global registries (Maps, Sets, Arrays modified at module level)
    - Located functions with implicit dependencies on module-level state
    - Checked for scattered process.env access
    - Documented impact of each global state instance on testing
    - Proposed ideas for refactoring global state to explicit dependencies
  `
}

function repositoryContext(): string {
  return dedent`
    # Repository Context

    Compile or update \`.dust/repository.md\` with a high-level overview of the repository's purpose, capabilities, and design philosophy.

    ## Purpose

    The repository context document helps downstream agents quickly understand the project without reading individual files. It describes features, scenarios, and design philosophy rather than implementation details. This enables high-level planning where agents reason about capabilities rather than code structure.

    ## Applicability

    If \`.dust/repository.md\` does not exist and this is a new project adoption, document that finding and proceed with creating an initial repository context document. If the project has no clear purpose or documentation to draw from, document that finding and skip the detailed analysis.

    ## Scope

    Review the current state of the codebase and produce a document covering:

    1. **What the project is** - A one-sentence summary of its purpose
    2. **What it does** - The key capabilities and features it provides
    3. **How it fits into workflows** - How users or other systems interact with it
    4. **Design philosophy** - The guiding principles behind its architecture
    5. **Key scenarios** - The main use cases or user journeys it supports

    Avoid mentioning specific file paths, class names, or implementation details. Write for someone who needs to make high-level suggestions about the project's direction, not someone about to edit a specific file.

    ## Analysis Steps

    1. Read the existing \`.dust/repository.md\` if it exists
    2. Review README, package.json, and top-level documentation for project purpose
    3. Scan the codebase to understand features and capabilities
    4. Review \`.dust/principles/\` for design philosophy
    5. Review \`.dust/facts/\` for context on current state
    6. Update \`.dust/repository.md\` with current findings, preserving any sections that are still accurate

    ## Blocked By

    (none)

    ## Definition of Done

    - \`.dust/repository.md\` exists and is up to date
    - Document describes what the project does without referencing specific files
    - Key capabilities and features are listed
    - Design philosophy or guiding approach is captured
    - Document is concise enough to fit comfortably in an agent context window
    - A new agent reading only this document could make sensible high-level suggestions
  `
}

function slowTests(): string {
  return dedent`
    # Slow Tests

    Identify slow-running tests that impact feedback loop speed.

    ${ideasHint}

    ## Scope

    Focus on these areas:

    1. **Test execution times** - Identify tests that exceed a reasonable duration threshold (e.g., 100ms for unit tests, 1s for integration tests)
    2. **I/O-bound tests** - Tests that perform actual file system, network, or database operations
    3. **Sleep/delay usage** - Tests using \`setTimeout\`, \`sleep\`, or similar timing functions
    4. **Missing mocks** - Tests that make real HTTP requests or database calls instead of using stubs
    5. **Setup overhead** - Expensive \`beforeEach\`/\`beforeAll\` setup that could be optimized or shared
    6. **Serial test execution** - Tests that could run in parallel but are forced to run serially

    ## Analysis Steps

    1. Identify the test framework and run the test suite with verbose/timing output enabled
    2. Identify tests taking longer than the threshold (100ms+ for unit, 1s+ for integration)
    3. Search for delay patterns in test files (sleep, timeout, wait functions)
    4. Look for real I/O: HTTP clients, database clients, file system operations without mocks
    5. Review test setup blocks for expensive operations
    6. Check test configuration for parallelization settings

    ## Output

    For each slow test identified, provide:
    - **Test name** - The describe/it block name
    - **File path** - Location of the test
    - **Duration** - How long the test takes (if measurable)
    - **Cause** - Why the test is slow (I/O, sleep, setup, etc.)
    - **Suggestion** - Specific optimization (mock the API, use fake timers, share setup, etc.)

    ## Blocked By

    (none)

    ## Definition of Done

    - Ran test suite with timing information
    - Listed tests exceeding duration thresholds (100ms unit, 1s integration)
    - Identified tests using sleep/setTimeout/delay patterns
    - Found tests with unmocked I/O (network, database, file system)
    - Reviewed beforeEach/beforeAll for optimization opportunities
    - Checked test parallelization configuration
    - Proposed ideas for optimizing the slowest tests
  `
}

function primitiveObsession(): string {
  return dedent`
    # Primitive Obsession

    Review high-confidence primitive obsession where call sites use free-form literals instead of canonical domain representations.

    ${ideasHint}

    ## Scope

    Focus only on two high-confidence slices:
    - Existing-type drift for domain string concepts
    - Numeric magic values where naming/domain wrappers would improve clarity

    Existing-type drift scope:
    - Call sites using free-form string literals where a canonical domain type already exists
    - Cases where the existing domain type is bypassed (for example artifact directory names that should use \`ArtifactType\`)
    - High-confidence matches where intent is clear and the existing type is directly applicable

    Numeric magic value scope:
    - Thresholds, limits, retries, and timing values whose domain meaning is clear at call sites
    - High-confidence literals that would be clearer as named constants or existing domain wrappers
    - Examples: retry counts like \`3\`, timeout values like \`30_000\`, batch limits like \`100\`

    Out of scope:
    - Proposing entirely new domain types in this slice
    - Ambiguous literals where no canonical existing type or constant naming opportunity can be identified with high confidence
    - Obvious local loop indices/counters and trivial literals like \`0\` or \`1\` where no domain meaning exists

    ## Analysis Steps

    1. Identify domain string concepts with existing canonical types (enums, unions, branded strings, or shared constants)
    2. Search for free-form string literals that represent those same concepts at call sites
    3. Identify numeric literals used as thresholds, limits, retries, or timing values where domain meaning is clear
    4. Keep only high-confidence findings (exclude ambiguous values and obvious local indices/counters)
    5. Group duplicate call-site drift by concept to avoid repetitive findings
    6. Preserve Functional Core, Imperative Shell boundaries in recommendations (pure matching/analysis logic separated from IO shell)
    7. Recommend incremental migrations only; avoid speculative introduction of brand-new types

    ## Output

    For each finding, provide:
    - **Locations** - File paths and line numbers where primitive literals are used
    - **Primitive pattern** - The free-form literal pattern currently used (string concept or numeric role)
    - **Constant/type opportunity** - The canonical existing type or named constant/domain wrapper that should be used instead
    - **Incremental migration path** - A safe sequence of steps to migrate call sites with minimal risk

    For numeric findings specifically, include:
    - **Locations** - File paths and line numbers for the numeric literals
    - **Numeric pattern** - The repeated threshold/limit/retry/timing literal pattern
    - **Constant/type opportunity** - A named constant or existing domain wrapper to encode intent
    - **Incremental migration path** - Steps to introduce the constant/wrapper and migrate call sites safely

    ## Blocked By

    (none)

    ## Definition of Done

    - Reviewed high-confidence existing-type drift for domain string literals and numeric magic values
    - Constrained findings to cases where canonical domain types or clear constant/wrapper opportunities already exist
    - Documented each finding with locations, primitive pattern, constant/type opportunity, and incremental migration path
    - Documented numeric findings with locations, numeric pattern, constant/type opportunity, and incremental migration path
    - Preserved Functional Core, Imperative Shell boundaries in recommendations
    - Avoided speculative introduction of entirely new types
    - Proposed ideas for primitive obsession improvements identified
  `
}

function singleResponsibilityViolations(): string {
  return dedent`
    # Single Responsibility Violations

    Review high-confidence single responsibility violations driven by responsibility count at function level.

    ${ideasHint}

    ## Scope

    Focus only on high-confidence function-level findings where one function clearly combines 3+ distinct responsibilities.

    Responsibility examples:
    - Parsing/validation
    - Domain decision/execution logic
    - Side effects or IO coordination
    - Presentation/formatting/reporting
    - Cross-module orchestration

    Include both runtime code and test helpers.

    Out of scope:
    - Module-level layer-mixing findings (future slices)
    - Collector/orchestrator hotspot findings based on collaborator/parameter load (future slices)
    - Functions with only one or two responsibilities
    - Ambiguous style-only concerns without clear responsibility boundaries
    - Broad rewrite recommendations without clear extraction seams

    ## Analysis Steps

    1. Identify runtime functions and test helpers that appear to mix concerns
    2. Keep findings only when 3+ distinct responsibilities are clearly present in the same function
    3. Validate a concrete extraction seam for each responsibility split (no speculative or style-only recommendations)
    4. Keep recommendations incremental and high-confidence only
    5. Preserve Functional Core, Imperative Shell boundaries by extracting pure logic from imperative shells where possible

    ## Output

    For each finding, provide:
    - **Location** - File path and function name where applicable
    - **Responsibility split** - Distinct responsibilities currently mixed (for example parsing, execution, presentation)
    - **Severity** - \`high\`, \`medium\`, or \`low\` based on extraction urgency and coupling risk
    - **Suggested extraction plan** - A small-step plan describing what to extract first, with Functional Core, Imperative Shell boundaries preserved

    ## Blocked By

    (none)

    ## Definition of Done

    - Reviewed high-confidence function-level findings where 3+ distinct responsibilities are combined
    - Included runtime code and test helpers in scope
    - Documented each finding with location, responsibility split, severity, and suggested extraction plan
    - Preserved Functional Core, Imperative Shell boundaries in recommendations
    - Kept recommendations high-confidence only with clear concern boundaries
    - Proposed ideas for substantial responsibility-splitting work identified
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

    ## Factory/Constructor Naming

    A specific case of terminology consistency: factory and constructor naming patterns.

    Focus on high-confidence inconsistencies where equivalent creation APIs use different naming variants:
    - \`build*\`, \`create*\`, \`make*\`, or \`new*\` prefixes for the same creation concept
    - Cases where names differ but behavior and role clearly indicate the same concept

    For each factory naming inconsistency, document:
    - **Locations** - File paths and line numbers where inconsistent names appear
    - **Inconsistent term set** - The observed naming variants (e.g., \`createWidget\`, \`buildWidget\`)
    - **Canonical proposal** - The recommended canonical name and rationale
    - **Migration strategy** - Incremental (aliases then cleanup) or one-shot (coordinated rename)

    ## Analysis Steps

    1. Identify key domain terms from documentation, README, or existing glossary
    2. Review recent commits for new terminology or naming choices
    3. Compare code identifiers against documented terminology
    4. Check user-facing strings for consistency with technical naming
    5. Flag deviations where the same concept uses different names
    6. Identify factory/constructor APIs using \`build*\`, \`create*\`, \`make*\`, or \`new*\` with equivalent behavior
    7. Group factory naming findings by shared creation concept

    ## Output

    For each terminology issue identified, provide:
    - **Term in question** - The inconsistent or unclear term
    - **Where found** - File paths and locations where the term appears
    - **Recommended action** - Standardize on existing term, or propose a new canonical name

    ## Blocked By

    (none)

    ## Definition of Done

    - Identified key domain terms from project documentation
    - Reviewed recent commits for terminology consistency
    - Compared code naming against documentation vocabulary
    - Checked user-facing text for alignment with code terms
    - Reviewed factory/constructor naming for \`build*\`, \`create*\`, \`make*\`, \`new*\` consistency
    - Documented any terminology drift or inconsistencies found
    - Proposed ideas for standardizing inconsistent terminology
  `
}

function designPatterns(): string {
  return dedent`
    # Design Patterns

    Identify refactoring opportunities to recognized design patterns using code smell triggers.

    ${ideasHint}

    ## Scope

    This audit surfaces opportunities to apply design patterns systematically using code smell triggers rather than structural heuristics. Use a low threshold for flagging patterns and let users filter relevance.

    ## Code Smell Triggers

    Flag patterns based on code smells that suggest pattern opportunities:

    1. **Switch statements on type** - Multiple switch/if-else chains branching on a type field suggest **Strategy** pattern (or discriminated unions in functional codebases)
    2. **Repeated object construction** - Similar multi-step object creation scattered across files suggests **Factory** pattern
    3. **Inconsistent interfaces** - Multiple implementations of similar behavior with different method signatures suggest interface **formalization**
    4. **Complex conditional creation logic** - Functions with many parameters or conditional object assembly suggest **Builder** pattern
    5. **State with multiple transitions** - Objects with mode/status fields and complex state transition logic suggest **State** pattern
    6. **Notification chains** - Manual event propagation or callback chains suggest **Observer** pattern

    ## Analysis Steps

    1. Search for switch statements and if-else chains that branch on type/kind/mode fields
    2. Look for similar object construction patterns repeated across multiple files
    3. Identify classes/interfaces with inconsistent method signatures for similar operations
    4. Find functions with 4+ parameters for object creation or complex conditional assembly
    5. Search for status/state/mode fields with multiple transition conditions
    6. Look for manual notification or callback propagation patterns

    ## Output Per Finding

    For each finding, provide:
    - **Location** - File and line range
    - **Code smell** - What triggered this recommendation (switch on type, repeated construction, etc.)
    - **Recommended pattern** - The suggested design pattern (Gang of Four name where applicable, or modern alternative)
    - **Trade-off analysis** - Pros (e.g., "Easier to add new types without modifying existing code") and cons (e.g., "Adds indirection, may be overkill for 2-3 cases")
    - **Migration complexity** - Low/Medium/High estimate with brief rationale

    ## Tech-Stack Considerations

    - Mention Gang of Four patterns by name where applicable
    - Note when patterns may not apply:
      - **Strategy** is less relevant in functional codebases where functions are first-class
      - **Visitor** can often be replaced with discriminated unions and exhaustive pattern matching
      - **Observer** may be superseded by reactive frameworks or event emitters
    - Suggest modern alternatives where appropriate (e.g., discriminated unions, higher-order functions, dependency injection)

    ## Blocked By

    (none)

    ## Definition of Done

    - Searched for switch statements on type/kind/mode fields
    - Identified repeated object construction patterns
    - Found inconsistent interfaces for similar behavior
    - Located complex conditional creation logic
    - Searched for state fields with multiple transitions
    - Identified notification chain patterns
    - Documented each finding with location, code smell, recommended pattern, trade-offs, and migration complexity
    - Noted tech-stack considerations where Gang of Four patterns may or may not apply
    - Proposed ideas for any design pattern improvements identified
  `
}

function testAssertions(): string {
  return dedent`
    # Test Assertions

    Review test assertions for quality signals beyond comprehensive assertions.

    ${ideasHint}

    ## Background

    The [Comprehensive Assertions](../principles/comprehensive-assertions.md) principle covers asserting whole objects rather than fragments. The [Self-Diagnosing Tests](../principles/self-diagnosing-tests.md) principle covers making failure messages informative. This audit addresses complementary assertion quality signals not covered by existing principles.

    ## Scope

    ### Deterministic Assertions

    Assertions should produce the same result regardless of execution timing or environment. Anti-patterns include:

    - Asserting on timestamps or dates without mocking time
    - Asserting on random values without seeding
    - Asserting on iteration order of unordered collections (objects, Sets, Maps)
    - Asserting on process IDs, file handles, or other system-allocated values

    Example:
    \`\`\`javascript
    // Non-deterministic: order depends on JS engine
    expect(Object.keys(result)).toEqual(['a', 'b', 'c'])

    // Deterministic: sort before comparison
    expect(Object.keys(result).sort()).toEqual(['a', 'b', 'c'])
    \`\`\`

    ### Fixed Delay Anti-patterns

    Tests should not use arbitrary fixed delays (\`setTimeout\`, \`sleep\`) to wait for async operations. Fixed delays are:

    - Flaky (may fail on slower machines or under load)
    - Slow (must wait the full delay even when the operation completes early)
    - Non-deterministic (timing varies across environments)

    Instead, tests should:
    - Use promise resolution (\`await\`/\`.then()\`)
    - Poll with short intervals until a condition is met
    - Use test framework utilities (\`vi.useFakeTimers()\`, \`waitFor()\`)
    - Inject controllable time dependencies

    Example:
    \`\`\`javascript
    // Bad: arbitrary 50ms delay
    await new Promise(r => setTimeout(r, 50))
    expect(state).toBe('ready')

    // Better: wait for the condition
    await vi.waitFor(() => expect(state).toBe('ready'))

    // Best: control time explicitly
    vi.useFakeTimers()
    vi.advanceTimersByTime(50)
    expect(state).toBe('ready')
    \`\`\`

    ### Precise but Not Exhaustive Assertions

    Assertions should verify the behavior under test without over-constraining implementation details. Exhaustive assertions that check every property can:

    - Couple tests tightly to implementation
    - Require test updates for unrelated changes
    - Obscure what the test is actually verifying

    This works in tension with [Comprehensive Assertions](../principles/comprehensive-assertions.md). Let context determine the balance:
    - Public API contracts → comprehensive assertions
    - Internal implementation tests → precise assertions
    - Snapshot tests → consider \`toMatchSnapshot()\` with care

    Example:
    \`\`\`javascript
    // Exhaustive: breaks if any internal field changes
    expect(result).toEqual({
      id: 'abc',
      name: 'test',
      _internal: {},
      _meta: { version: 1 },
      _cache: null,
    })

    // Precise: verifies only the relevant properties
    expect(result).toMatchObject({
      id: 'abc',
      name: 'test',
    })
    \`\`\`

    ### One Logical Assertion Per Test

    Tests should ideally verify one behavior or scenario. When a test has multiple unrelated assertions, a failure in the first masks all subsequent ones.

    This does not mean "one \`expect\` call per test". A single logical assertion may require multiple \`expect\` calls to express (especially for complex state). The [Comprehensive Assertions](../principles/comprehensive-assertions.md) principle often allows collapsing multiple calls into one whole-object assertion.

    The anti-pattern to avoid:
    \`\`\`javascript
    test('user validation', () => {
      // Multiple unrelated behaviors in one test
      expect(validateEmail('bad')).toBe(false)
      expect(validateEmail('good@example.com')).toBe(true)
      expect(validatePassword('short')).toBe(false)
      expect(validatePassword('LongEnough123!')).toBe(true)
    })
    \`\`\`

    Prefer separate tests for separate behaviors:
    \`\`\`javascript
    test('rejects invalid email format', () => {
      expect(validateEmail('bad')).toBe(false)
    })

    test('accepts valid email format', () => {
      expect(validateEmail('good@example.com')).toBe(true)
    })
    \`\`\`

    ## Analysis Steps

    1. Search for assertions on \`Date.now()\`, \`new Date()\`, or timestamp fields without fake timers
    2. Look for assertions on \`Object.keys()\` or property iteration without sorting
    3. Find \`setTimeout\`, \`sleep\`, or fixed delays in test files
    4. Identify tests with many unrelated assertions covering multiple behaviors
    5. Review snapshot usage for overly broad snapshots that capture internal details
    6. Check for assertions on random or system-allocated values (PIDs, UUIDs without seeding)

    ## Output

    For each finding, provide:
    - **Location** - File path and line number
    - **Pattern** - Which category of issue (non-deterministic, fixed delay, exhaustive, multiple behaviors)
    - **Impact** - How this affects test reliability or maintainability
    - **Suggestion** - Specific fix (sort keys, use fake timers, split test, use toMatchObject, etc.)

    ## Blocked By

    (none)

    ## Definition of Done

    - Searched for non-deterministic assertions (timestamps, object key order, random values)
    - Identified fixed delay patterns in test files
    - Reviewed assertions for over-constraining internal details
    - Found tests covering multiple unrelated behaviors
    - Documented each finding with location, pattern, impact, and suggestion
    - Proposed ideas for any assertion quality improvements identified
  `
}

function algorithms(): string {
  return dedent`
    # Algorithms

    Evaluate algorithmic complexity and identify performance bottlenecks.

    ${ideasHint}

    ## Scope

    Focus on these areas:

    1. **Nested loops or recursive calls** - Functions with O(n²) or worse complexity due to nested iteration
    2. **Linear search inside loops** - Use of \`.includes()\`, \`.indexOf()\`, or \`.find()\` inside loops (potential O(n²))
    3. **Missing Map/Set usage** - Repeated lookups in arrays where O(1) data structures would help
    4. **Repeated string operations in loops** - Substring, split, join operations creating unnecessary allocations
    5. **Missing early returns or break conditions** - Loops that continue processing after the result is found
    6. **Graph/tree operations without cycle protection** - Recursive traversals that may infinite loop on cyclic structures

    ## Analysis Steps

    1. Search for nested \`for\`/\`while\`/\`forEach\` loops and recursive functions
    2. Look for \`.includes()\`, \`.indexOf()\`, \`.find()\` calls inside loop bodies
    3. Identify arrays used for repeated membership testing that could be Sets
    4. Find string operations (\`substring\`, \`split\`, \`join\`, \`+\` concatenation) inside loops
    5. Check loops for opportunities to \`break\` or \`return\` early
    6. Review recursive functions for visited/seen tracking in graph-like structures

    ## Output Per Finding

    For each finding, provide:
    - **Function name and location** - File path, line number, and function name
    - **Current complexity analysis** - Big-O notation with explanation (e.g., "O(n²) due to nested iteration over items array")
    - **Data structures involved** - What collections are being processed
    - **Suggested optimization** - Specific fix (e.g., "Convert users array to Set for O(1) lookup", "Add visited Set to prevent cycles")
    - **Acceptable complexity assessment** - Whether the current complexity is acceptable given expected input sizes (e.g., "Acceptable for small configs (<100 items), problematic for large datasets")

    ## Blocked By

    (none)

    ## Definition of Done

    - Searched for nested loops and recursive functions
    - Identified linear search operations inside loops
    - Found arrays that could benefit from Set/Map conversion
    - Located repeated string operations in loops
    - Reviewed loops for missing early exit conditions
    - Checked recursive graph/tree operations for cycle protection
    - Documented each finding with function name, location, complexity, data structures, optimization, and acceptability assessment
    - Proposed ideas for any algorithmic improvements identified
  `
}

function loggingAndTraceability(): string {
  return dedent`
    # Logging and Traceability

    Review logging practices for runtime observability and diagnostic usefulness.

    ${ideasHint}

    ## Scope

    Focus on these areas:

    1. **Runtime observability** - Is it easy to understand what's happening when the application runs?
    2. **Diagnostic usefulness** - Is it easy for agents and humans to use logs to diagnose issues at development time?
    3. **Log levels** - Are appropriate log levels used (debug, info, warn, error)?
    4. **Contextual information** - Do logs include enough context to trace execution flow?
    5. **Structured logging** - Are logs structured (e.g., JSON) for easy parsing?
    6. **Log consistency** - Do similar operations produce similar log output?

    ## Analysis Steps

    1. Identify logging calls throughout the codebase (\`console.log\`, \`logger.info\`, etc.)
    2. Review error handling paths for appropriate error logging
    3. Check if logs include enough context (operation name, relevant IDs, timestamps)
    4. Look for silent failures - catch blocks without logging
    5. Evaluate whether running the application produces understandable output
    6. Test whether logs help diagnose common failure scenarios

    ## Output

    For each finding, provide:
    - **Location** - File path and line number
    - **Category** - Which area of concern (observability, diagnostic usefulness, log levels, context, structure, consistency)
    - **Issue** - What's missing or problematic
    - **Impact** - How this affects debugging or understanding system behavior
    - **Suggestion** - Specific improvement (add logging, change level, add context, etc.)

    ## Blocked By

    (none)

    ## Definition of Done

    - Reviewed logging coverage across the codebase
    - Identified silent failures (catch blocks without logging)
    - Evaluated log levels for appropriateness
    - Checked logs for sufficient context (operation names, IDs, relevant state)
    - Assessed whether running the application produces understandable output
    - Tested whether logs help diagnose common failure scenarios
    - Proposed ideas for any logging improvements identified
  `
}

function testPyramid(): string {
  return dedent`
    # Test Pyramid

    Evaluate whether tests follow the test pyramid pattern.

    ${ideasHint}

    ## Background

    The test pyramid model suggests:
    - **Many fast unit tests** (base) — pure, isolated, testing single units
    - **Fewer integration tests** (middle) — testing interactions between components
    - **Minimal end-to-end tests** (top) — slow, broad tests exercising full systems

    Projects with an inverted pyramid suffer from slow feedback loops and difficulty isolating failures.

    ## Scope

    ### Test Classification

    Determine test types by examining project structure. Common patterns include:

    - **Directory conventions**: \`unit/\`, \`integration/\`, \`e2e/\`, or co-located tests vs \`system-tests/\`
    - **Test runners**: Different runners for different types (e.g., vitest for unit, bun test for system)
    - **Configuration**: Look at test config files for exclusions or separate setups

    First identify how this specific project organizes tests, then classify accordingly.

    ### Time Analysis

    Include execution time per tier, not just test count. A pyramid with 100 unit tests taking 10 seconds each and 10 e2e tests taking 1 second each has problems the count alone wouldn't reveal.

    To obtain timing:
    1. Identify the test framework used in this project
    2. Run the test suite with JSON or verbose output (most frameworks support timing data)
    3. Extract per-test duration from the output

    ## Analysis Steps

    1. Examine project structure to understand how tests are organized
    2. Identify the test classification strategy used (directories, config files, runners)
    3. Count tests in each category (unit, integration, e2e)
    4. Run tests with timing output to measure execution time per tier
    5. Look for "unit" tests that perform I/O (process spawning, network calls, file system access)
    6. Evaluate pyramid shape based on counts and timing

    ## Output

    Report the following:

    1. **Test distribution** — counts and percentages per category
    2. **Time distribution** — total execution time per tier
    3. **Pyramid health** — flag obvious inversions:
       - More e2e tests than unit tests
       - More time spent in integration/e2e than unit tests
    4. **Miscategorized tests** — tests that appear to be in the wrong tier based on their behavior (e.g., "unit" tests with I/O)
    5. **Recommendations** — specific actions to improve the pyramid shape

    ## Relative Guidance

    Flag obvious problems without prescribing exact ratios. Examples of problems:
    - More end-to-end tests than unit tests
    - More time spent in integration/e2e than unit tests
    - Unit tests that perform I/O (process spawning, network calls, file system access)

    ## Blocked By

    (none)

    ## Definition of Done

    - Identified how this project organizes and classifies tests
    - Counted tests per category (unit, integration, e2e)
    - Measured execution time per tier
    - Flagged obvious pyramid inversions (more e2e than unit, more time in e2e)
    - Identified miscategorized tests (e.g., unit tests with I/O)
    - Provided specific recommendations to improve pyramid shape
    - Proposed ideas for any substantial test restructuring needed
  `
}

function idiomaticStyle(): string {
  return dedent`
    # Idiomatic Style

    Review recent changes to ensure implementation follows idiomatic practices for the technology stack.

    ${ideasHint}

    ## Scope

    Focus on these areas:

    1. **Language idioms** - Does code follow language-specific patterns and conventions? (e.g., Python comprehensions, JavaScript destructuring, TypeScript type narrowing)
    2. **Framework patterns** - Are framework/library APIs used as intended? (e.g., React hooks rules, Express middleware patterns, test framework best practices)
    3. **Style consistency** - Do recent changes match the established code style in this codebase?
    4. **Anti-patterns** - Are common pitfalls for this stack being avoided?
    5. **Modern alternatives** - Are deprecated or outdated approaches being used where better alternatives exist?

    ## Analysis Steps

    1. Identify the technology stack by examining package.json, config files, or file extensions
    2. Review recent commits (last 10-20 commits) to understand what changed
    3. For each change, evaluate against idiomatic practices for that language/framework
    4. Check for deviations from established patterns in the existing codebase
    5. **IMPORTANT**: If uncertain about current best practices (e.g., due to stale training data), consult official documentation or authoritative sources for the latest guidance before flagging issues

    ## Output

    For each finding, provide:
    - **Location** - File path and line numbers
    - **Pattern** - What the code is currently doing
    - **Idiom issue** - How this deviates from idiomatic practice
    - **Best practice** - What the idiomatic approach would be (with reference to documentation if applicable)
    - **Impact** - Why this matters (readability, performance, maintainability, community expectations)

    ## Tech-Stack Considerations

    Be specific to the detected stack. Examples:

    - **TypeScript**: Prefer type narrowing over type assertions, use \`const\` assertions, leverage discriminated unions
    - **React**: Follow hooks rules, prefer controlled components, avoid inline function definitions in JSX for performance
    - **Node.js**: Use async/await over callbacks, prefer native ES modules, handle streams properly
    - **Testing**: Use framework-specific matchers, follow Arrange-Act-Assert pattern, avoid test interdependence

    When the technology or its ecosystem is evolving rapidly, explicitly note when findings should be verified against current documentation.

    ## Blocked By

    (none)

    ## Definition of Done

    - Identified the technology stack in use
    - Reviewed recent commits for idiom issues
    - Checked code against language and framework best practices
    - Verified current documentation for any uncertain cases
    - Evaluated code style consistency with rest of codebase
    - Identified anti-patterns or deprecated approaches
    - Proposed ideas for any idiomaticity improvements identified
  `
}

function uxAudit(): string {
  return dedent`
    # UX Audit

    Review the end user experience by capturing visual or interactive evidence at key scenarios.

    ${ideasHint}

    ## Scope

    1. **Identify key scenarios** - What are the main user journeys? (e.g., signup, login, checkout, onboarding, core workflows)
    2. **Capture evidence** - For each scenario:
       - Web apps: Take screenshots at each step using browser automation (Playwright, Puppeteer, Cypress, or similar)
       - Terminal apps: Capture command output and interactive sessions
    3. **Review captured evidence** for UX issues:
       - Confusing or unclear states
       - Missing feedback or loading indicators
       - Error messages that don't guide recovery
       - Inconsistent styling or layout
    4. **Document findings** with screenshots/output and specific recommendations

    ## Applicability

    Determine the application type and available tooling:
    - If browser tests exist (Playwright, Puppeteer, Cypress), extend them to capture screenshots
    - If no browser tests exist, write a standalone script for key scenarios
    - For terminal apps, capture representative sessions using command output or terminal recording

    If the project has no user-facing interface, document that finding and skip the detailed analysis.

    ## Analysis Steps

    1. Identify the application type (web, terminal, hybrid, no UI)
    2. List the key user scenarios from documentation, tests, or code analysis
    3. Capture screenshots or output at each stage of each scenario
    4. Store artifacts in a temporary directory for review during this audit
    5. Review each artifact for UX issues
    6. Document findings with evidence and specific recommendations

    ## Output

    For each UX issue identified, provide:
    - **Location** - Which scenario and step
    - **Evidence** - Screenshot filename or captured output
    - **Problem** - What's wrong from the user's perspective
    - **Impact** - How it affects the user's ability to complete their goal
    - **Recommendation** - Specific fix
    - **Verification** - How to verify the fix (e.g., "Screenshot at step 3 should show success message instead of spinner")

    ## Blocked By

    (none)

    ## Definition of Done

    - Identified the application type (web, terminal, hybrid, or no UI)
    - Listed key user scenarios
    - Captured screenshots or output at each stage of key scenarios
    - Reviewed evidence for UX issues
    - Documented findings with evidence and recommendations
    - Included verification criteria for each issue
    - Created ideas for any UX improvements needed
  `
}

function dependencyHealth(): string {
  return dedent`
    # Dependency Health

    Review project dependencies for maintenance and security concerns beyond CVE scanning.

    ${ideasHint}

    ## Context

    Healthy dependencies require more than security patches. Unmaintained packages, version drift, and deprecated packages all impact project health and can introduce agent confusion when outdated documentation or APIs don't match reality.

    ## Scope

    Focus on these areas:

    1. **Packages with no recent releases** - Identify dependencies that haven't been updated in 2+ years (potential abandonment)
    2. **Major version drift** - Find dependencies more than 2 major versions behind latest (missing features, eventual migration pain)
    3. **Deprecated packages** - Detect packages marked as deprecated on npm
    4. **Better-maintained alternatives** - Flag packages with known successors (e.g., \`request\` → \`node-fetch\` or \`got\`)

    ## Analysis Steps

    ### 1. Check Package Release Dates

    For each dependency in \`package.json\`:

    1. Run \`npm view <package-name> time --json\` to get release history
    2. Check the date of the latest release
    3. Flag packages where the latest release is more than 2 years old

    Example:
    \`\`\`bash
    npm view lodash time --json | jq -r 'to_entries | sort_by(.value) | last | .value'
    \`\`\`

    ### 2. Identify Major Version Drift

    Compare installed versions against latest:

    1. Run \`npm outdated --json\` to see current vs latest versions
    2. Parse version numbers to identify major version differences
    3. Flag dependencies more than 2 major versions behind

    Example output to parse:
    \`\`\`json
    {
      "example-package": {
        "current": "2.1.0",
        "wanted": "2.5.0",
        "latest": "5.0.0"
      }
    }
    \`\`\`

    In this case, the package is 3 major versions behind (2.x → 5.x).

    ### 3. Detect Deprecated Packages

    Check deprecation status:

    1. Run \`npm view <package-name> deprecated\` for each dependency
    2. If the field exists and is non-empty, the package is deprecated
    3. The deprecation message often suggests an alternative

    Example:
    \`\`\`bash
    npm view request deprecated
    # Output: "request has been deprecated..."
    \`\`\`

    ### 4. Identify Better-Maintained Alternatives

    Known package migrations to check for:

    | Deprecated/Unmaintained | Recommended Alternative |
    |------------------------|------------------------|
    | \`request\` | \`node-fetch\`, \`got\`, \`axios\` |
    | \`moment\` | \`date-fns\`, \`dayjs\`, \`luxon\` |
    | \`uuid\` v3 or earlier | \`uuid\` v8+ or \`crypto.randomUUID()\` |
    | \`rimraf\` | \`fs.rm\` (Node 14.14+) |
    | \`mkdirp\` | \`fs.mkdir\` with \`recursive: true\` |
    | \`node-fetch\` | native \`fetch\` (Node 18+) |
    | \`colors\` | \`chalk\`, \`picocolors\` |
    | \`faker\` | \`@faker-js/faker\` |
    | \`left-pad\` | \`String.prototype.padStart()\` |
    | \`underscore\` | \`lodash\` or native methods |

    Search for these packages in \`package.json\` and flag any matches.

    ## Output

    For each concern found, document:

    - **Package name** - The npm package name
    - **Current version** - Version installed in the project
    - **Type of concern** - One of: \`unmaintained\`, \`outdated\`, \`deprecated\`, \`superseded\`
    - **Details** - Last release date, version gap, deprecation message, or successor package
    - **Suggested action** - One of:
      - \`update\` - Upgrade to latest version
      - \`replace\` - Migrate to a successor package
      - \`remove\` - Remove if no longer needed
      - \`accept\` - Accept the risk with documented rationale

    Example findings:

    \`\`\`markdown
    ### moment (v2.29.4)

    - **Concern**: superseded
    - **Details**: moment is in maintenance mode; the team recommends date-fns, Luxon, or Day.js for new projects
    - **Action**: replace with \`date-fns\` for tree-shaking benefits, or \`dayjs\` for API compatibility

    ### request (v2.88.2)

    - **Concern**: deprecated
    - **Details**: Package deprecated in February 2020. Message: "request has been deprecated"
    - **Action**: replace with \`node-fetch\` (for simple cases) or \`got\` (for advanced features)

    ### some-legacy-lib (v1.0.0)

    - **Concern**: unmaintained
    - **Details**: Last release was 3 years ago (2021-01-15)
    - **Action**: evaluate if still needed; if so, consider forking or finding alternative
    \`\`\`

    ## Blocked By

    (none)

    ## Definition of Done

    - [ ] Checked package release dates for all dependencies
    - [ ] Identified packages with no releases in 2+ years
    - [ ] Ran \`npm outdated\` to find major version drift
    - [ ] Flagged packages more than 2 major versions behind
    - [ ] Checked deprecation status of all dependencies
    - [ ] Searched for packages with known better-maintained alternatives
    - [ ] Documented each concern with package name, version, type, and suggested action
    - [ ] Created ideas for any dependency health improvements needed
  `
}

function ciDevelopmentParity(): string {
  return dedent`
    # CI / Development Parity

    Identify discrepancies between checks run locally via \`dust check\` and those run in CI.

    ${ideasHint}

    ## Context

    When developers run different checks locally than CI runs remotely, several problems emerge:

    1. **False confidence** - CI might pass while local checks fail, or vice versa
    2. **Wasted cycles** - Developers push code that passes locally only to have CI fail
    3. **Agent confusion** - AI agents rely on consistent feedback; discrepancies trigger incorrect debugging paths

    The [Reproducible Checks](../principles/reproducible-checks.md) principle ensures the same checks run everywhere.

    ## Scope

    This audit performs a bidirectional comparison:

    1. **Checks in dust but not in CI** (local-only checks)
    2. **Checks in CI but not in dust** (CI-only checks)

    ## Analysis Steps

    ### 1. Detect Local Checks

    Read \`.dust/config/settings.json\` to identify checks configured for \`dust check\`:

    \`\`\`json
    {
      "checks": [
        { "name": "lint", "command": "eslint ." },
        { "name": "typecheck", "command": "tsc --noEmit" },
        { "name": "test", "command": "vitest run" }
      ]
    }
    \`\`\`

    Extract check names and commands for comparison.

    ### 2. Parse CI Configuration

    Search for CI workflow files and parse them for check commands:

    - \`.github/workflows/*.yml\` (GitHub Actions)
    - \`.gitlab-ci.yml\` (GitLab CI)
    - \`.circleci/config.yml\` (CircleCI)

    Look for these check categories in CI:

    - **linting** - eslint, oxlint, biome lint, ruff, golangci-lint
    - **formatting** - prettier, oxfmt, biome format, black, gofmt
    - **type-checking** - tsc, mypy, pyright
    - **build** - npm/bun/yarn build, go build, cargo build
    - **unit-tests** - vitest, jest, pytest, go test, cargo test
    - **unused-code** - knip

    ### 3. Follow Indirect References

    When CI runs commands like \`npm run check\` or \`./scripts/check.sh\`, follow one level of indirection:

    1. If CI runs \`npm run check\`, check \`package.json\` scripts for what \`check\` executes
    2. If CI runs a script file, read that script to identify the actual checks
    3. Map these resolved commands back to check categories

    Example indirect reference resolution:
    \`\`\`yaml
    # CI workflow runs:
    - run: npm run check
    \`\`\`

    \`\`\`json
    // package.json scripts section:
    "check": "eslint . && tsc --noEmit"
    \`\`\`

    This resolves to: linting and type-checking in CI.

    ### 4. Bidirectional Comparison

    Compare check categories between local (dust) and CI:

    | Category | In Dust | In CI | Gap |
    |----------|---------|-------|-----|
    | linting | ✓ | ✓ | None |
    | type-checking | ✓ | ✗ | CI missing |
    | tests | ✗ | ✓ | Dust missing |

    ## Output

    For each gap found, create an idea file with:

    ### For Local-Only Checks (in dust, not in CI)

    \`\`\`markdown
    # Add [Check Name] to CI

    The \`[check-name]\` check runs locally via \`dust check\` but is not run in CI.

    ## Impact

    - Developers may push code that passes locally but fails CI on other checks
    - CI provides no coverage for [check category]
    - The [Stop the Line](../principles/stop-the-line.md) principle is violated - problems aren't caught before merge

    ## Suggested Fix

    Add to \`.github/workflows/ci.yml\`:

    \`\`\`yaml
    - name: [Check Name]
      run: [command]
    \`\`\`

    Or ensure CI runs \`dust check\` which includes this check.
    \`\`\`

    ### For CI-Only Checks (in CI, not in dust)

    \`\`\`markdown
    # Add [Check Name] to dust check

    The \`[check-name]\` check runs in CI but is not configured in \`dust check\`.

    ## Impact

    - Developers don't get [check category] feedback until CI runs
    - [Fast Feedback Loops](../principles/fast-feedback-loops.md) are broken - local checks give incomplete picture
    - Agents may make changes that pass local checks but fail CI

    ## Suggested Fix

    Add to \`.dust/config/settings.json\`:

    \`\`\`json
    { "name": "[check-name]", "command": "[command]" }
    \`\`\`
    \`\`\`

    ## Blocked By

    (none)

    ## Definition of Done

    - [ ] Read \`.dust/config/settings.json\` and extracted check categories
    - [ ] Parsed CI configuration files for check commands
    - [ ] Followed indirect references (npm run scripts, shell scripts) one level deep
    - [ ] Identified local-only checks (in dust but not CI)
    - [ ] Identified CI-only checks (in CI but not dust)
    - [ ] Created idea files for each gap with suggested fix
    - [ ] Each idea links to relevant principles
  `
}

function commitMessageQuality(): string {
  return dedent`
    # Commit Message Quality

    Review recent commits for message quality and traceability issues.

    ${ideasHint}

    ## Context

    The [Traceable Decisions](../principles/traceable-decisions.md) principle emphasizes that commit history should explain why changes were made. Good commit messages help agents understand project history and make better decisions. This audit evaluates commit message quality itself, not the code changes.

    ## Scope

    Analyze the last 50 commits for these quality issues:

    1. **Generic messages** - Non-descriptive messages like "fix", "update", "WIP", "changes", "stuff", "misc"
    2. **Missing why** - Messages that describe what changed but not why
    3. **Breaking changes** - Breaking commits without explanation of impact
    4. **Multi-concern commits** - Commits that bundle unrelated changes
    5. **Missing links** - Commits without links to related issues, tasks, or context

    ## Analysis Steps

    ### 1. Gather Recent Commits

    Run \`git log -50 --pretty=format:"%H|%s|%b---END---"\` to get recent commits with their full messages.

    ### 2. Detect Generic Messages

    Flag commits where the subject line:
    - Is a single word like "fix", "update", "changes", "WIP", "stuff", "misc", "cleanup"
    - Starts with generic verbs without context: "Fix bug", "Update file", "Change code"
    - Is very short (under 10 characters) without meaningful content

    Example findings:
    \`\`\`markdown
    ### Generic: abc1234
    - **Message**: "fix"
    - **Issue**: Single-word message provides no context
    - **Suggestion**: Describe what was fixed and why, e.g., "Fix null pointer when user has no email"
    \`\`\`

    ### 3. Detect Missing "Why"

    Flag commits where:
    - The subject describes what changed but the body is empty or doesn't explain motivation
    - Technical changes lack business or user context
    - Refactoring commits don't explain why the refactoring was needed

    Look for these patterns that suggest missing "why":
    - "Add X" without explaining why X was needed
    - "Remove X" without explaining why X was unnecessary
    - "Refactor X" without explaining what problem the refactoring solves

    Example finding:
    \`\`\`markdown
    ### Missing Why: def5678
    - **Message**: "Add caching to API calls"
    - **Issue**: Doesn't explain why caching was added (performance problem? rate limits? user experience?)
    - **Suggestion**: Include the motivation, e.g., "Add caching to API calls to reduce rate limit errors during high traffic"
    \`\`\`

    ### 4. Flag Breaking Changes Without Impact

    Identify breaking changes by looking for:
    - Subject contains "BREAKING", "breaking", or "!"
    - Changes to public APIs, configuration schemas, database migrations
    - Removal of features or options

    Flag if the body doesn't explain:
    - What exactly breaks
    - Who is affected
    - How to migrate

    Example finding:
    \`\`\`markdown
    ### Breaking Without Impact: ghi9012
    - **Message**: "BREAKING: Remove legacy auth"
    - **Issue**: Doesn't explain impact or migration path
    - **Suggestion**: Add body explaining: "Removes support for v1 auth tokens. Users must regenerate tokens via /settings. This affects deployments using tokens created before 2024."
    \`\`\`

    ### 5. Detect Multi-Concern Commits

    Use \`git show --stat <hash>\` to get changed files per commit.

    Flag commits that appear to bundle unrelated changes:
    - Files across multiple unrelated modules or directories
    - Mix of feature code and unrelated refactoring
    - Multiple distinct logical changes in one commit

    Look for signals like:
    - Changes to both frontend and backend for unrelated features
    - Test files for different features modified together
    - Configuration changes bundled with unrelated code changes

    Example finding:
    \`\`\`markdown
    ### Multi-Concern: jkl3456
    - **Message**: "Add user dashboard and fix email validation"
    - **Files Changed**: src/dashboard/*, src/email/*, tests/email/*
    - **Issue**: Bundles unrelated features - dashboard addition and email validation fix
    - **Suggestion**: Split into atomic commits: one for the dashboard feature, one for the email fix
    \`\`\`

    ### 6. Check for Missing Links

    Flag commits that reference issues or tasks without links:
    - Mentions "the bug", "the issue", "the task" without a link or ID
    - Describes a problem without linking to where it was reported
    - References external context without providing a way to access it

    Also note commits for significant features or bug fixes that lack any external reference.

    Example finding:
    \`\`\`markdown
    ### Missing Link: mno7890
    - **Message**: "Fix the authentication bug reported last week"
    - **Issue**: References a bug report but doesn't link to it
    - **Suggestion**: Include issue reference, e.g., "Fix authentication timeout (fixes #123)" or link to discussion
    \`\`\`

    ## Output

    For each quality issue found, create an idea file documenting:

    1. **Commit hash and message** - The specific commit with the issue
    2. **Type of issue** - One of: generic, missing-why, breaking-without-impact, multi-concern, missing-link
    3. **Suggested improvement** - Concrete guidance for future commits

    Group related issues into a single idea file if they suggest a systemic pattern (e.g., "Multiple commits lack issue links" rather than one idea per commit).

    ## Blocked By

    (none)

    ## Definition of Done

    - [ ] Reviewed last 50 commits for quality issues
    - [ ] Identified commits with generic/non-descriptive messages
    - [ ] Identified commits missing "why" context
    - [ ] Identified breaking changes without impact documentation
    - [ ] Identified commits bundling unrelated changes
    - [ ] Identified commits missing links to issues/tasks
    - [ ] Created idea files for patterns found
    - [ ] Each idea includes concrete suggestions for improvement
  `
}

function suggestAudits(): string {
  // Build the list of available audits with descriptions
  // Exclude 'suggest-audits' itself to avoid circular reference
  const auditList = Object.entries(stockAuditFunctions)
    .filter(([name]) => name !== 'suggest-audits')
    .toSorted(([a], [b]) => a.localeCompare(b))
    .map(([name, render]) => {
      const template = render()
      const description = extractOpeningSentence(template)
      return `- **${name}**: ${description}`
    })
    .join('\n')

  // Build template in parts to avoid dedent issues with interpolated multi-line strings
  let content = dedent`
    # Suggest Audits

    Analyze recent commits and create tasks for relevant audits to run.

    ## Context

    This audit examines recent commit history and suggests which stock audits would be valuable based on what changed. Rather than manually selecting audits, this provides an automated way to maintain codebase health by matching recent work to appropriate audits.

    ## Commit Range

    Determine which commits to analyze:

    1. Check VCS history for a prior \`suggest-audits\` run: \`git log --grep="suggest-audits" -1 --format=%H\`
    2. If found, analyze commits since that commit
    3. If not found, analyze the last 20 commits as a fallback

    ## Available Audits

  `

  content += '\n\n' + auditList + '\n'

  content += dedent`

    ## Analysis Steps

    1. **Gather commits** - Get the list of commits in the determined range with their messages and changed files
    2. **Categorize changes** - Group commits by the type of work (features, fixes, refactoring, tests, docs, config)
    3. **Match to audits** - For each relevant audit, explain why recent changes make it valuable:
       - What specific commits or file changes triggered the suggestion?
       - What might the audit uncover given this context?
    4. **Create tasks** - For each suggested audit, create a task file in \`.dust/tasks/\`

    ## Output

    Create task files (not idea files) for each suggested audit. Task files should:

    - Be placed in \`.dust/tasks/\` with filename like \`run-<audit-name>-audit.md\`
    - Include a clear title matching the audit name
    - Explain why the audit is relevant given recent commits
    - Reference specific commits or changes that triggered the suggestion

    Example task file content:

    \`\`\`markdown
    # Run Security Review Audit

    Run the \`security-review\` audit to verify security practices in recent changes.

    ## Why Now

    Recent commits added authentication handling in \`src/auth/\`:
    - abc1234: Add login endpoint
    - def5678: Store user tokens

    These changes involve sensitive security patterns that should be reviewed.

    ## Blocked By

    (none)

    ## Definition of Done

    - [ ] Run \`bin/dust audit security-review\`
    - [ ] Address any findings
    \`\`\`

    ## Blocked By

    (none)

    ## Definition of Done

    - [ ] Determined commit range (since last suggest-audits run or last 20 commits)
    - [ ] Analyzed commits for changed files and commit messages
    - [ ] Identified relevant audits based on change patterns
    - [ ] Created task files for each suggested audit with rationale
    - [ ] Each task explains why the audit is valuable given recent changes
  `

  return content
}

const stockAuditFunctions: Record<string, () => string> = {
  'agent-developer-experience': agentDeveloperExperience,
  'agent-instruction-quality': agentInstructionQuality,
  algorithms: algorithms,
  'checks-audit': checksAuditTemplate,
  'ci-development-parity': ciDevelopmentParity,
  'commit-message-quality': commitMessageQuality,
  'dependency-health': dependencyHealth,
  'documentation-drift': documentationDrift,
  'component-reuse': componentReuse,
  'coverage-exclusions': coverageExclusions,
  'data-access-review': dataAccessReview,
  'dead-code': deadCode,
  'design-patterns': designPatterns,
  'error-handling': errorHandling,
  'facts-verification': factsVerification,
  'feedback-loop-speed': feedbackLoopSpeed,
  'global-state': globalState,
  'commit-review': commitReview,
  'ideas-from-principles': ideasFromPrinciples,
  'idiomatic-style': idiomaticStyle,
  'logging-and-traceability': loggingAndTraceability,
  'primitive-obsession': primitiveObsession,
  'repository-context': repositoryContext,
  'security-review': securityReview,
  'single-responsibility-violations': singleResponsibilityViolations,
  'slow-tests': slowTests,
  'stale-ideas': staleIdeas,
  'suggest-audits': suggestAudits,
  'test-assertions': testAssertions,
  'test-pyramid': testPyramid,
  'ubiquitous-language': ubiquitousLanguage,
  'ux-audit': uxAudit,
}

export function loadStockAudits(): StockAudit[] {
  return Object.entries(stockAuditFunctions)
    .toSorted(([a], [b]) => a.localeCompare(b))
    .map(([name, render]) => {
      const template = render()
      const description = extractOpeningSentence(template)
      return { name, description: description as string, template }
    })
}
