# Directory Hierarchy Audit

Add a stock audit that reviews the directory hierarchy and suggests improvements for consistency, logical grouping, and clarity.

## Context

Directory structure is a primary navigation mechanism in codebases. The codebase already values intuitive organization through the "Intuitive Directory Structure" principle (.dust/principles/intuitive-directory-structure.md:1), which states that "code should be organized around related concerns in clearly named directories."

Currently there is no systematic audit to:
- Identify directories that mix unrelated concerns
- Suggest logical groupings that aren't reflected in the structure
- Find unnecessary nesting or overly flat hierarchies
- Ensure directory naming follows consistent conventions
- Detect orphaned or singleton directories that should be consolidated

## Proposed Audit

Add a stock audit named `directory-hierarchy` in `lib/audits/stock-audits.ts`.

The audit should review the repository's directory structure and create ideas for improvements in these areas:

1. **Concern mixing** - Directories containing files that serve different purposes (e.g., utilities mixed with domain logic, tests mixed with config)
2. **Missing logical groupings** - Related files scattered across multiple locations that could be consolidated
3. **Depth inconsistency** - Some areas deeply nested while similar concerns are flat
4. **Naming consistency** - Directory names that don't follow established patterns or are unclear
5. **Singleton directories** - Directories containing a single file or subdirectory that add unnecessary nesting
6. **Orphaned files** - Files at inappropriate levels that should move into subdirectories

## Analysis Approach

The audit should:
1. Map the directory tree structure (excluding node_modules, .git, dist, build artifacts)
2. Analyze each directory's contents to understand its purpose
3. Identify patterns in directory naming and organization
4. Look for inconsistencies where similar concerns are organized differently
5. Create ideas for structural improvements with specific refactoring suggestions

## Output Format

For each finding, create an idea that includes:
- Current directory structure issue (specific paths)
- Why the current structure is problematic (navigation, clarity, consistency)
- Proposed reorganization with before/after structure
- Migration impact (file moves, import updates)

## Relationship to Existing Audits

- Complements `dead-code` by identifying structural cleanup opportunities
- Complements `component-reuse` by surfacing grouping opportunities
- Aligns with `ubiquitous-language` for consistent directory naming

## Open Questions

### Should this audit focus on source directories only or include configuration?

#### Option: Source code directories only

Focus on `lib/`, `src/`, `app/`, etc. Exclude configuration directories like `.dust/`, `.github/`, `config/`. Benefits: cleaner scope, avoids suggesting changes to conventional config locations.

#### Option: All project directories

Review the entire repository structure including configuration, build scripts, and tooling directories. Benefits: comprehensive coverage, can identify config organization issues.

### How should the audit handle established conventions (like node_modules, .git)?

#### Option: Hard-coded exclusion list

Maintain a built-in list of directories to skip (node_modules, .git, dist, build, coverage, etc.). Benefits: clean output, avoids noise.

#### Option: Configurable exclusion patterns

Allow users to specify exclusion patterns in `.dust/config/settings.json`. Benefits: flexibility for non-standard project structures.

#### Option: Hybrid approach

Hard-coded list for universal conventions, plus user configuration for project-specific exclusions.

### Should the audit detect depth threshold violations?

#### Option: Flag excessive nesting depth

Report directories nested beyond a threshold (e.g., 5-6 levels deep) as potential over-engineering. Benefits: enforces reasonable hierarchy depth.

#### Option: Context-aware depth analysis

Evaluate depth relative to the project size and complexity rather than absolute thresholds. Benefits: avoids false positives in legitimately complex projects.

#### Option: No depth rules

Focus on logical grouping and naming consistency without enforcing depth limits. Benefits: simpler, avoids arbitrary rules.

### How should migration impact be communicated?

#### Option: List affected import paths

For each suggested reorganization, enumerate files that would need import updates. Benefits: clear migration scope.

#### Option: Provide migration complexity score

Rate each suggestion as low/medium/high complexity based on number of files moved and imports affected. Benefits: helps prioritize changes.

#### Option: Include automated refactoring hints

Suggest specific commands or tools (like TypeScript's rename/move refactoring) that could automate the migration. Benefits: actionable guidance.

### Should the audit detect "feature-based" vs "type-based" organization?

#### Option: Detect organization style inconsistency

Identify when some areas are organized by feature (e.g., `user-management/`, `billing/`) while others are by type (e.g., `models/`, `controllers/`). Flag when both patterns coexist at the same level. Benefits: promotes consistent organization philosophy.

#### Option: Neutral on organization style

Don't prefer one style over another, just focus on consistency within each style. Benefits: respects project conventions.
