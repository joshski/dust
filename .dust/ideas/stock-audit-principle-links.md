# Stock Audit Principle Links

Stock audit templates contain links to dust's own principles, but these links break in consumer repositories.

## Problem

Stock audits in `lib/audits/stock-audits.ts` include `## Principles` sections with relative links:

```markdown
## Principles

- [Decoupled Code](../principles/decoupled-code.md)
- [Fast Feedback](../principles/fast-feedback.md)
```

When `dust audit <name>` creates a task file at `.dust/tasks/audit-<name>.md`, these links resolve to `.dust/principles/decoupled-code.md`. If the consumer repository doesn't have those principle files, `dust lint` reports "Broken link" errors for each one.

## Affected Audits

Most stock audits include principle links (found in 23 out of 26 audits). For example:
- `data-access-review` links to Decoupled Code, Fast Feedback, Maintainable Codebase
- `coverage-exclusions` links to Decoupled Code, Unit Test Coverage, Comprehensive Test Coverage, Make Changes with Confidence
- `checks` links to Agent Autonomy, Stop the Line, Lint Everything, Comprehensive Test Coverage

## Validation Behavior

The `validateLinks` function in `lib/lint/validators/link-validator.ts:72` checks if relative link targets exist on disk:

```typescript
if (!fileSystem.exists(resolvedPath)) {
  violations.push({
    file: artifact.filePath,
    message: `Broken link: "${link.target}"`,
    line: link.line,
  })
}
```

This is correct behavior - broken links should be flagged. The issue is that stock audits generate content that will inevitably fail validation in consumer repositories.

## Relationship to Built-in Principles

The [Built-in Principles](built-in-principles.md) idea proposes exposing dust's principles to downstream users. If implemented, those principles would be accessible via commands like `dust core principles` but would not exist as files in `.dust/principles/`. The links would still be broken.

## Relationship to Audit Template Interpolation

The [Audit Template Interpolation](audit-template-interpolation.md) idea addresses replacing directory paths with dust commands. This idea is narrower - it focuses specifically on broken principle links in `## Principles` sections.

## Open Questions

### How should stock audits reference principles?

#### Remove Principles sections from stock audits

The simplest solution: delete `## Principles` sections from all stock audits. Principles sections are optional in task files, and the audit content itself explains the relevant concepts.

Pros: Simple fix, no validation failures, no ongoing maintenance burden.

Cons: Loses the explicit connection between audits and principles, reduces discoverability.

#### Convert links to plain text

Replace markdown links with plain principle names:

```markdown
## Principles

- Decoupled Code
- Fast Feedback
```

Pros: Preserves the principle references without broken links, valid markdown.

Cons: Links are no longer navigable, inconsistent with how other artifacts reference principles.

#### Use external links to dust documentation

Link to principles in dust's GitHub repository or published documentation:

```markdown
## Principles

- [Decoupled Code](https://github.com/joshski/dust/blob/main/.dust/principles/decoupled-code.md)
```

Pros: Links work, points to canonical source.

Cons: Verbose, creates dependency on external URLs, links may break over time.

#### Skip validation for stock audit content

Modify the linter to not validate principle links in task files generated from stock audits.

Pros: Preserves current template content.

Cons: Adds complexity, special-casing validation defeats its purpose, the links are still broken for users trying to navigate them.

#### Conditionally include Principles sections

Only include `## Principles` sections when the consumer repository has a `.dust/principles/` directory with the referenced files.

Pros: Links only appear when they work.

Cons: Complex to implement, requires inventory of which principles exist locally.

### Should this solution apply to user-defined audits too?

#### Yes - validate all audit principle links at creation time

When `dust audit <name>` creates a task file, validate that principle links will resolve. Warn or error if they won't.

Pros: Prevents broken links proactively.

Cons: Adds complexity, may frustrate users who don't care about validation.

#### No - only fix stock audits

User-defined audits in `.dust/config/audits/` are the user's responsibility. If they include broken links, that's their choice.

Pros: Simpler, respects user autonomy.

Cons: Inconsistent experience between stock and user audits.
