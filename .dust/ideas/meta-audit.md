# Meta Audit

An audit that analyzes recent commit activity and selects which other audits to run based on what changed.

## Context

The current audit system (`lib/audits/stock-audits.ts:357-378`) provides 10 stock audits covering different aspects of codebase health: dead code, test coverage, security, performance, facts verification, and more. Each audit is independent and runs in isolation when invoked via `dust audit <name>`.

Currently, selecting which audit to run is a manual decision. A user or agent must know:
1. What audits are available
2. Which audit is relevant to recent work
3. When an audit is worth running

A meta-audit would automate this selection by analyzing recent commits and determining which audits are most relevant. For example:
- Changes to `.dust/facts/` files would trigger the `facts-verification` audit
- Changes to test files might trigger the `test-coverage` audit to ensure new code is tested
- Changes to security-sensitive files could trigger the `security-review` audit

The existing `ideas-from-commits` audit already reviews recent commit history (last 20 commits) to find improvement opportunities. The meta-audit would use similar commit analysis but with a different purpose: selecting which audits to run rather than generating new ideas.

The pre-push hook in `lib/cli/commands/pre-push.ts` demonstrates existing patterns for commit change detection:
- `parseGitDiffNameStatus()` parses `git diff --name-status` output
- `getChangesFromRemote()` gets file changes for unpushed commits
- File categorization by path patterns (e.g., `.dust/tasks/`, `.dust/ideas/`)

## How it could work

When invoked, the meta-audit would:
1. Analyze the last N commits (or unpushed commits)
2. Categorize changed files by path and type
3. Map file categories to relevant audits
4. Create tasks for the selected audits

## Open Questions

### What should trigger each audit?

#### Option: Path-based rules

Define explicit mappings from file paths to audits:
- `.dust/facts/*` changes trigger `facts-verification`
- `.dust/principles/*` changes trigger `ideas-from-principles`
- `*.test.*` or `__tests__/*` changes trigger `test-coverage`
- `package.json` or lockfile changes trigger `security-review`

Simple and predictable, but requires maintaining a mapping table.

#### Option: Commit message analysis

Parse commit messages for keywords or patterns that suggest audit relevance. For example, commits mentioning "refactor" might trigger `dead-code` or `component-reuse`.

More flexible but less reliable; depends on commit message quality.

#### Option: Change size heuristics

Large commits (many files changed, many lines added) might benefit from broader audits like `agent-developer-experience` or `performance-review`. Small, focused commits might need narrower audits.

Captures a dimension that path-based rules miss, but may trigger false positives.

### Should the meta-audit create tasks or run audits directly?

#### Option: Create audit tasks

The meta-audit outputs a list of recommended audits and creates task files for each. The agent or loop then works through these tasks. Consistent with the existing task-based workflow.

#### Option: Run audits inline

The meta-audit executes selected audits as part of its own run, producing a combined report. More immediate but loses the task-tracking benefits.

#### Option: Create a single combined task

Rather than separate audit tasks, create one task that includes instructions to run the selected audits. Keeps the work unit atomic.

### How should audit results be aggregated?

#### Option: Independent tasks

Each triggered audit becomes its own task. Results are separate and can be worked on independently. Matches current audit behavior.

#### Option: Prioritized list

The meta-audit produces a ranked list of audits by relevance. Only the top N are created as tasks to avoid overwhelming the work queue.

#### Option: Dependency-aware scheduling

Some audits might logically depend on others (e.g., fix dead code before checking performance). The meta-audit could order tasks accordingly.

### What time window should the meta-audit analyze?

#### Option: Fixed commit count

Analyze the last N commits (e.g., 20, matching `ideas-from-commits`). Simple and consistent.

#### Option: Unpushed commits only

Use `getChangesFromRemote()` to analyze only commits not yet pushed. Focuses on recent local work that might need review before sharing.

#### Option: Time-based window

Analyze commits from the last N days. Better for infrequent committers but may span unrelated work.

#### Option: Since last audit

Track when audits were last run and analyze commits since then. Ensures complete coverage but requires state tracking.

### Should some audits always run regardless of changes?

#### Option: Periodic audits

Some audits like `stale-ideas` or `security-review` are valuable to run periodically regardless of what changed. The meta-audit could include these on a schedule.

#### Option: Change-triggered only

Keep the meta-audit focused on change relevance. Periodic audits can be scheduled separately.

#### Option: Configurable

Allow users to configure which audits should always be included in meta-audit runs via `.dust/config/`.
