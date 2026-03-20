# Prevent Tasks From Escaping .dust Directory

Audit tasks should not modify files outside the `.dust/` directory. This can be enforced through instructions and the git hook.

## Context

Audit tasks (created via `dust audit <name>`) are canned tasks that help maintain project health by reviewing code patterns and creating ideas for improvements. These tasks are explicitly read-only - they should produce ideas in `.dust/ideas/` but never modify source code.

The current implementation in `lib/audits/stock-audits.ts` includes an `ideasHint` that instructs agents to "create new idea files in `./.dust/ideas/`", but:

1. The instruction is guidance only - nothing prevents an eager agent from "fixing" issues it finds
2. The definition of done checklist doesn't explicitly state that source code must remain unchanged
3. There's no enforcement mechanism if an agent does modify code

### Relevant Architecture

The pre-push hook (`lib/cli/commands/pre-push.ts`) already has infrastructure for analyzing commit changes:

- `parseGitDiffNameStatus()` parses git diff output into `FileChange[]` objects
- `analyzeChangesForTaskOnlyPattern()` checks if commits only add task files
- The hook can block pushes and emit helpful error messages

This infrastructure could be extended to enforce that audit task commits only touch `.dust/` files.

### Stock Audit Structure

All 11 stock audits (`lib/audits/stock-audits.ts`) follow a consistent structure:
- Title describing the audit focus
- Opening sentence explaining purpose
- `ideasHint` constant instructing to create ideas, not modify code
- `## Scope` section defining what to review
- `## Analysis Steps` or similar guidance
- `## Blocked By` (always `(none)`)
- `## Definition of Done` checklist

The `transformAuditContent()` function (`lib/audits/index.ts`) transforms audit templates into task files, prefixing the title with "Audit:".

## Two-Layer Solution

### Layer 1: Clear Instructions (Low Cost, High Value)

Add explicit instruction to audit templates stating that source code must not be modified. This could be:

1. **Add to `ideasHint`**: Expand the constant to explicitly state "Do not modify source code"
2. **Add Definition of Done item**: Add "- No changes to files outside `.dust/`" to each audit's definition of done
3. **Add dedicated section**: Add a `## Constraints` section to audit templates

### Layer 2: Git Hook Enforcement (Higher Cost, Safety Net)

Extend the pre-push hook to detect and block commits from audit tasks that modify non-`.dust/` files:

1. Detect when the commit message starts with "Audit:"
2. Check if any changed files are outside `.dust/`
3. Block push and emit helpful message if violations found

This provides a safety net even if instructions are ignored.

## Related Principles

- **Agent Autonomy** (`agent-autonomy.md`): Agents should be productive without constant supervision - clear constraints enable this
- **Stop the Line** (`stop-the-line.md`): The git hook would halt and prevent defects from propagating
- **Task-First Workflow** (`task-first-workflow.md`): Task instructions should clearly define the scope of allowed changes

## Open Questions

### Which tasks should have this constraint?

#### Audit tasks only

Only audit tasks (those with "Audit:" prefix in commit messages) are constrained. Other task types remain unrestricted.

Pros: Minimal change, targeted to the known problem
Cons: Other read-only task types may emerge that need the same protection

#### Configurable per task type

Allow task templates to declare whether they're read-only through metadata or a section like `## Scope: read-only`.

Pros: Flexible, future-proof
Cons: Requires template format changes, more implementation work

#### User-configurable whitelist/blacklist

Allow `.dust/config/settings.json` to specify which task prefixes are read-only.

Pros: Repository-specific customization
Cons: Configuration complexity, harder to discover

### Should the git hook enforcement be enabled by default?

#### Enabled by default

The hook always checks audit commits for non-`.dust/` changes.

Pros: Immediate protection, opt-out rather than opt-in
Cons: May surprise users, potential false positives during transition

#### Opt-in via configuration

Add a setting like `"enforceAuditScope": true` to `.dust/config/settings.json`.

Pros: Non-breaking, allows gradual adoption
Cons: Many repositories won't enable it, reduces protection

#### Enabled only in unattended mode

Check is active when `DUST_UNATTENDED=1` but not during interactive sessions.

Pros: Protects autonomous agents while allowing human flexibility
Cons: Inconsistent behavior between modes

### What error message should the hook display?

#### Terse technical message

```
Push blocked: Audit task modified files outside .dust/
  → src/parser.ts
  → lib/utils.ts
```

#### Instructional message with guidance

```
⚠️  Push blocked: Audit tasks should not modify source code.

This commit is prefixed with "Audit:" but includes changes to:
  → src/parser.ts
  → lib/utils.ts

Audit tasks should only create or modify files in .dust/ideas/.
If these changes are intentional, create a separate task to implement them.
```

Pros: Clearer guidance for agents
Cons: More verbose output
