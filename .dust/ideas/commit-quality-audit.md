# Commit Quality Audit

Add a stock audit that identifies violations of commit quality principles, particularly "atomic-commits" and "traceable-decisions".

## Context

The "atomic-commits" principle states that each commit should tell a complete story, bundling implementation changes with their corresponding documentation updates. The "traceable-decisions" principle emphasizes that commit history should explain why changes were made, not just what changed.

High-quality commits make it easier for both humans and agents to:
- Understand the evolution of the codebase
- Identify when and why a change was made
- Revert changes safely if needed
- Review changes effectively

Currently, there is no stock audit to systematically review commit quality. Common violations include:
- Commits mixing unrelated changes
- Implementation changes without corresponding test updates
- Documentation drift (docs not updated with code)
- Vague commit messages ("fix bug", "update code")
- Missing "why" context in commit messages
- Large commits that should be split
- Fixup commits that should have been squashed

## Proposed Audit

Create a `commit-quality` stock audit in `lib/audits/stock-audits.ts` that:

1. **Analyzes recent commit history**:
   - Review last N commits (e.g., 50-100)
   - Parse commit messages and changed files
   - Identify patterns and violations

2. **Checks for atomic commit violations**:
   - Code changes without corresponding test updates
   - Implementation changes without documentation updates
   - Mixing unrelated concerns in one commit
   - Very large commits (e.g., 20+ files changed)

3. **Evaluates commit message quality**:
   - Vague or uninformative messages
   - Missing "why" context (only describing "what")
   - Inconsistent message format
   - Missing references to issues/tickets
   - Commit messages that don't match actual changes

4. **Identifies commit hygiene issues**:
   - Fixup/squash commits on main branch
   - "WIP" or temporary commits
   - Commits that immediately revert previous commits
   - Merge commits in trunk-based workflow

## Related Principles

- **atomic-commits** - Primary principle this audit enforces
- **traceable-decisions** - Commit messages should explain why
- **trunk-based-development** - Clean commit history on main
- **task-first-workflow** - Commits should relate to tasks
- **comprehensive-test-coverage** - Tests should be updated with code

## Example Patterns to Detect

```bash
# Vague commit message
git commit -m "fix bug"
git commit -m "update code"
git commit -m "changes"

# Missing why context
git commit -m "Add caching to user service"
# Better: "Add caching to user service to reduce database load during peak hours"

# Non-atomic: mixing concerns
git commit -m "Add user profile feature and fix payment bug"

# Missing test update
git commit -m "Add new validation to checkout flow"
# Changed: src/checkout.ts
# Missing: src/checkout.test.ts

# Missing doc update
git commit -m "Add new API endpoint"
# Changed: src/api/routes.ts
# Missing: README.md or API docs

# Large unfocused commit
git commit -m "Refactor"
# Changed: 35 files across multiple modules
```

## Output Format

For each pattern found, create ideas containing:
- Type of violation (non-atomic, vague message, missing tests, etc.)
- Example commits demonstrating the pattern
- Frequency of the pattern (how often it occurs)
- Suggested improvements or guidelines
- Whether the pattern is increasing or decreasing over time

## Open Questions

### How far back should the audit look?

#### Option: Recent window (last 50-100 commits)

Focus on recent history to identify current practices.

Pros: Relevant to current team habits, manageable scope
Cons: May miss historical patterns

#### Option: Time-based window (last 3-6 months)

Review commits from a specific time period.

Pros: Accounts for varying commit frequency
Cons: May include too many or too few commits depending on project activity

#### Option: Since last release/tag

Analyze commits since the last version tag.

Pros: Release-aligned analysis
Cons: Irregular intervals between releases

### Should the audit analyze commit authors?

#### Option: Per-author patterns

Identify which authors have patterns of good/poor commit quality.

Pros: Can provide targeted education
Cons: May feel like surveillance, could be sensitive

#### Option: Aggregate patterns only

Report overall patterns without author attribution.

Pros: Non-judgmental, team-focused
Cons: Harder to provide specific feedback

### How should the audit determine if a commit is atomic?

#### Option: File-based heuristics

If code files changed, expect test files to change too. If API changed, expect docs to change.

Pros: Objective, automatable
Cons: May have false positives (not all changes need tests/docs)

#### Option: Semantic analysis

Analyze commit diffs to determine if changes are related.

Pros: More accurate
Cons: Complex, hard to automate reliably

#### Option: Manual review

Identify potentially non-atomic commits for manual review.

Pros: Avoids false positives
Cons: Less systematic

### Should the audit enforce commit message format?

#### Option: Require conventional commits

Check for conventional commit format (feat:, fix:, docs:, etc.).

Pros: Structured, machine-readable
Cons: May not be project convention, feels prescriptive

#### Option: Flexible format with quality checks

Don't require specific format, but check for minimum quality (length, clarity, etc.).

Pros: Less prescriptive, adapts to project style
Cons: More subjective

#### Option: No format enforcement

Focus only on message quality and content, not structure.

Pros: Maximum flexibility
Cons: Less consistent, harder to automate checks

### How should the audit handle different commit types?

#### Option: Different rules for different types

Apply stricter rules to feature commits, looser rules to doc-only commits.

Pros: Context-appropriate
Cons: Requires commit type classification

#### Option: Uniform standards

Apply same quality standards to all commits.

Pros: Simpler, consistent
Cons: May be too strict for minor commits

### Should the audit detect correlation with task completion?

#### Option: Link commits to tasks

Check if commits reference task files or mention dust in commit messages.

Pros: Enforces task-first workflow
Cons: Dust-specific, may not apply to all projects

#### Option: Generic commit quality only

Focus on general commit quality without dust-specific checks.

Pros: Broadly applicable
Cons: Misses task workflow violations
