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

### Related principles

- [Agent Context Inference](../principles/agent-context-inference.md) - While agents can discover context, explicit hints improve efficiency
- [Progressive Disclosure](../principles/progressive-disclosure.md) - Ad-hoc details are optional, keeping the simple case simple
- [Unsurprising UX](../principles/unsurprising-ux.md) - The command should accept details naturally, following established patterns

## How it will work

Accept freeform text as a single focus argument:

```
dust audit security-review "Focus on JWT token handling in src/auth/"
dust audit test-coverage "Verify the new payment module has adequate coverage"
dust audit dead-code "Check for unused exports after the refactoring in lib/legacy/"
```

The focus text is captured as a single string and embedded into the generated task file under a `## Focus` heading, placed after the title and before other sections:

```markdown
# Audit: Security Review

## Focus

Focus on JWT token handling in src/auth/

## Scope

Focus on these areas:
...
```

When no focus is provided, the command works exactly as it does today - no Focus section is added.

### Command interface

Following the [Command Syntax](../facts/command-syntax.md) pattern (verb-then-noun with natural reading), the focus is passed as a second positional argument. This keeps the simple case simple while allowing optional context:

```
dust audit <name> [focus]
```

### Changes required

1. **CLI command** (`lib/cli/commands/audit.ts`): Pass optional second argument to the audits repository
2. **Audits repository** (`lib/audits/index.ts`): Accept `focus` option in `createAuditTask`, inject into content
3. **Content transformation**: Extend `transformAuditContent` to inject `## Focus\n\n{focus}\n\n` after the title when provided
4. **Tests** (`lib/audits/index.test.ts`): Add test coverage for focus injection behavior

### Design decisions

- **Single text field**: No flags, no complex parsing. Users write whatever context is relevant in natural language.
- **Pass through verbatim**: No validation of paths or commits. The agent will discover if paths don't exist. This allows conceptual focus areas like "authentication flow" alongside file paths.
- **Focus section placement**: After the title puts user-provided context prominently visible, before the standard template content.
- **Optional feature**: Users who don't need focus can continue using `dust audit <name>` unchanged.

## Blocked By

(none)
