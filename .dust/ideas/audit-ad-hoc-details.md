# Audit Ad-hoc Details

Allow users to specify additional context when creating an audit task, such as specific files, commits, or focus areas.

## Context

The current audit command (`lib/cli/commands/audit.ts:33-80`) accepts only an audit name:

```
dust audit <name>       - Create a task from the audit template
```

When an audit task is created, it uses the stock template content verbatim. The agent then works through a generic scope with no awareness of what triggered the audit or what specific areas might need attention.

In practice, audits often arise from specific concerns:
- A security review prompted by changes to authentication code
- A test coverage audit focused on a newly added feature
- A dead code check after a refactoring effort
- A performance review of a specific API endpoint

The agent could be more effective if it knew the context that motivated the audit. Currently, users would need to manually edit the generated task file to add this context, which is friction that could be automated.

### Related ideas

- [Meta Audit](meta-audit.md) - Proposes automatically selecting audits based on recent commit activity; the ad-hoc details feature would complement this by allowing manual context specification
- [Audit Workflow Guidance](audit-workflow-guidance.md) - Proposes guidance for working through audits; could reference how to use ad-hoc details effectively

### Related principles

- [Agent Context Inference](../principles/agent-context-inference.md) - While agents can discover context, explicit hints improve efficiency
- [Progressive Disclosure](../principles/progressive-disclosure.md) - Ad-hoc details could be optional, keeping the simple case simple
- [Unsurprising UX](../principles/unsurprising-ux.md) - The command should accept details naturally, following established patterns

## How it could work

Extend the audit command to accept additional arguments or a details block:

```
dust audit security-review src/auth/
dust audit test-coverage --since abc123
dust audit dead-code lib/legacy/
```

The details would be injected into the generated task file, either:
1. As a new "## Context" or "## Focus" section at the top
2. Appended to the existing "## Scope" section
3. As metadata that appears before the standard template content

The agent would then see both the general audit template and the specific context provided, allowing it to focus its efforts.

## Open Questions

### How should ad-hoc details be passed to the command?

#### Option: Positional arguments after audit name

```
dust audit security-review src/auth/ src/api/middleware.ts
```

Pros: Simple, no flags needed, feels natural
Cons: Ambiguous whether arguments are files, directories, or general text

#### Option: Named flags for different detail types

```
dust audit security-review --files src/auth/ --commits abc123..def456 --focus "JWT validation"
```

Pros: Explicit intent, supports multiple detail types, self-documenting
Cons: More verbose, more to remember, may feel heavy for quick audits

#### Option: Freeform text after separator

```
dust audit security-review -- Focus on JWT token handling in src/auth/
```

Pros: Flexible, allows natural language, simple implementation
Cons: Less structured, harder to parse programmatically if needed later

#### Option: Interactive prompt for details

```
dust audit security-review
> Enter focus areas (optional): JWT validation in src/auth/
```

Pros: Guided experience, can explain what details are useful
Cons: Breaks non-interactive usage, adds friction for quick invocations

### How should details appear in the generated task file?

#### Option: As a new "## Focus" section

Insert a new section between the title and the standard template:

```markdown
# Audit: Security Review

## Focus

- Files: src/auth/, src/api/middleware.ts
- Since commit: abc123
```

Pros: Clear separation, easy to identify user-provided context
Cons: Adds a new section format that agents need to understand

#### Option: Prepended to the "## Scope" section

Integrate the details into the existing Scope section:

```markdown
## Scope

**Specific focus areas provided:**
- src/auth/
- JWT token handling

Focus on these areas:
1. **Input validation** - ...
```

Pros: Keeps section count unchanged, context is near related content
Cons: Mixes generated and user content in one section

#### Option: As leading prose before any sections

```markdown
# Audit: Security Review

This audit was requested with specific focus on: src/auth/, JWT validation.

Review the codebase to identify security vulnerabilities...
```

Pros: Natural reading flow, context appears immediately
Cons: Could be overlooked as boilerplate, less structured

### Should file/commit details be validated?

#### Option: No validation

Accept whatever the user provides and include it verbatim. The agent will discover if paths don't exist or commits aren't valid.

Pros: Simple implementation, flexible input, works for conceptual focus areas too
Cons: Errors surface late, may waste agent effort on invalid paths

#### Option: Validate files exist, warn on missing

Check that provided paths exist; warn but continue if they don't.

Pros: Catches typos early, still allows intentional patterns
Cons: May reject valid glob patterns or future files

#### Option: Validate and fail on invalid

Require all file paths to exist before creating the audit task.

Pros: Prevents clearly broken audit tasks
Cons: Overly strict, blocks legitimate use cases like "review deleted code"

### Should ad-hoc details be stored separately from the task file?

#### Option: Inline in task file only

The details become part of the task file content. No separate storage.

Pros: Single source of truth, simple, task is self-contained
Cons: Lost when task is deleted, can't easily query what context was provided

#### Option: Separate metadata file

Store details in `.dust/config/audit-context/security-review.json` or similar.

Pros: Could persist across audit runs, enables tooling around audit history
Cons: Adds complexity, two places to look, sync issues

#### Option: Git commit metadata

If details include commits, use git notes or similar to link audits to specific commits.

Pros: Tight integration with version control, traceable
Cons: Complex implementation, git notes are obscure, may not suit all detail types
