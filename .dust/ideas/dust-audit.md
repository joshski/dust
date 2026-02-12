# dust audit

A command for running canned "audit tasks" — predefined checks or prompts that help maintain project health or consistency.

## Overview

Running `dust audit` lists available audit tasks from two sources:

1. **User-configured audits** in `.dust/config/audits/*.md` (takes precedence)
2. **Stock audits** bundled with dust (fallback)

Running `dust audit <name>` adds a copy of the specified audit task to `.dust/tasks/`, similar to how workflow tasks are created. The task file would contain instructions for an agent to perform the audit and report findings.

## Command Behavior

### `dust audit` (list mode)

Displays available audit tasks in a style similar to `dust tasks`:

```
🔍 Audits

Audits are canned tasks that help maintain project health.

# security-review
Check for common security issues in the codebase.
→ stock

# test-coverage
Identify areas with missing test coverage.
→ .dust/config/audits/test-coverage.md
```

The arrow indicates whether the audit comes from stock (bundled) or from user configuration.

### `dust audit <name>` (add mode)

Creates a task file from the audit template:

1. Look for `.dust/config/audits/<name>.md` first
2. Fall back to stock audit with that name
3. Copy the content to `.dust/tasks/audit-<name>.md`
4. Output the path to the created task

The task title would follow a consistent pattern like "Audit: Security Review" to distinguish audit tasks from regular tasks.

## Stock Audits

Potential stock audits that dust could bundle:

- **security-review** - Check for hardcoded secrets, SQL injection patterns, etc.
- **test-coverage** - Identify untested code paths or missing test files
- **dead-code** - Find unused exports, unreachable code
- **dependency-audit** - Review outdated or vulnerable dependencies
- **documentation-gaps** - Find undocumented public APIs
- **code-style** - Check for consistency issues not caught by linters
- **performance** - Identify potential performance bottlenecks

Stock audits would live in `lib/templates/audits/` or similar, following the existing template pattern.

## Relationship to Existing Concepts

### Similar to Checks

Checks (`.dust/config/settings.json`) are automated scripts that run and pass/fail. Audits are different: they produce tasks for agents to investigate and report on, not automated pass/fail results.

### Similar to Workflow Tasks

Like `createRefineIdeaTask` and similar workflow functions, audits create task files that guide agent behavior. The pattern of "stock" vs "configured" parallels how checks have both built-in (`lint markdown`) and user-configured entries.

### Task Prefix Pattern

Could follow the `Audit: <Name>` prefix pattern, similar to `Refine Idea: <Name>`. This would allow the linter to validate that audit tasks reference valid audit templates.

## Implementation Considerations

### Directory Structure

User audits would live in `.dust/config/audits/`:

```
.dust/
├── config/
│   ├── settings.json
│   └── audits/
│       ├── test-coverage.md
│       └── security-review.md
```

This follows the existing pattern of putting configuration in `.dust/config/`.

### Audit File Format

Audit templates could be simple markdown with the task content:

```markdown
# Security Review

Review the codebase for common security issues.

## Goals

- [Make Changes with Confidence](../goals/make-changes-with-confidence.md)

## Blocked By

(none)

## Definition of Done

- [ ] Scanned for hardcoded secrets
- [ ] Checked for SQL injection vulnerabilities
- [ ] Reviewed authentication/authorization logic
- [ ] No high-severity issues remain unaddressed
```

### Naming Uniqueness

If a user-configured audit has the same name as a stock audit, the user version takes precedence. This allows users to customize stock audits while keeping the same name.

## Open Questions

### Should audit tasks be reusable or one-shot?

#### One-shot (delete after completion)

Like other tasks, audit tasks are deleted when completed. Running `dust audit security-review` again creates a fresh task.

#### Track audit history

Keep completed audit tasks or their results somewhere, so teams can see when audits were last run and what was found.

### Should audits support parameters?

#### No parameters

Keep audits simple — the template is the template. Users can customize by creating their own audit files.

#### Support template variables

Allow `dust audit security-review --scope=lib/` to pass variables into the audit template, similar to how templates use `{{variable}}` interpolation.

### How should "stock" audits be discovered?

#### Hardcoded list

Stock audits are compiled into the dust binary/bundle. Simple but requires a release to add new audits.

#### External repository

Stock audits are fetched from a GitHub repository or npm package, allowing community contributions without dust releases.

#### Both

Ship with a base set, but allow an "audit source" configuration to pull additional audits from external sources.

### Should running an audit also offer to pick that task immediately?

#### Just create the task

`dust audit security-review` creates the task and outputs its path. The user/agent decides when to pick it.

#### Offer to focus

After creating the task, prompt: "Task created. Run `dust focus 'Audit: Security Review'` to start?"

### What happens if the audit task already exists?

#### Error and refuse

If `.dust/tasks/audit-security-review.md` exists, refuse to create a duplicate.

#### Overwrite with confirmation

Prompt the user before overwriting an existing audit task.

#### Allow multiple

Create `.dust/tasks/audit-security-review-2.md` etc. to allow running the same audit multiple times in parallel.

### Should audits be able to create sub-tasks?

#### Self-contained

An audit task contains all the instructions. The agent produces findings in one pass.

#### Can spawn tasks

An audit might discover issues that warrant their own tasks. The audit template could include instructions for creating follow-up tasks.
