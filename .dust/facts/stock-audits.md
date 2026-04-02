# Stock Audits

Dust includes a library of stock audits in the package for downstream consumers to use out-of-the-box.

## What Stock Audits Are

Stock audits are reusable audit templates built into the `@joshski/dust` package. They provide ready-made review workflows for common quality concerns without requiring users to write custom audit templates. Each stock audit focuses on a specific aspect of codebase health — security, performance, testing, documentation, or architectural patterns.

The stock audit library is exposed via the `@joshski/dust/audits` export and loaded from `lib/audits/stock-audits.ts`. As of this writing, dust ships with 40 stock audits covering areas like dead code detection, test quality, error handling consistency, dependency health, and more.

## Purpose and Design Constraints

Stock audits are designed primarily for **downstream consumers** — developers using dust in their own projects, not just contributors working on the dust codebase itself. This creates specific design constraints:

### Domain and Tech Stack Agnostic

Stock audits must work across different domains and technology stacks. An audit about "test quality" should apply whether the project uses JavaScript, Python, Go, or Rust; whether it's a web app, CLI tool, or data pipeline. Audits achieve this by:

- Focusing on universal patterns rather than framework-specific conventions
- Providing guidance on detecting applicability ("If your project doesn't use databases, skip the data access review")
- Using pattern matching and code structure analysis rather than assuming specific tools

### Read-Only Analysis

Stock audits are **strictly read-only**. They analyze the codebase and generate ideas for improvements but never modify source code directly. This constraint:

- Makes audits safe to run repeatedly without risk of unintended changes
- Ensures audit results can be reviewed before action is taken
- Keeps the audit focused on analysis rather than implementation

Each audit template explicitly states: "Do not modify source code - create ideas instead."

### Progressive Disclosure

Audits provide enough context to be actionable but avoid overwhelming output. The audit framework supports this through:

- Structured scopes that define what to look for
- Analysis steps that guide the review process
- Definition of Done checklists to verify completeness
- Applicability sections to avoid false positives in irrelevant codebases

### Reusability and Overriding

Projects can override stock audits by placing a file with the same name in `.dust/config/audits/`. This allows teams to:

- Customize stock audits to their specific needs
- Add domain-specific checks while keeping the same audit name
- Maintain continuity when a stock audit doesn't quite fit their context

User-configured audits always take precedence over stock audits with the same name (see lib/audits/index.ts:130-149).

## Writing Good Stock Audits

When writing stock audits, keep these principles in mind:

1. **Be specific about scope** - Clearly define what the audit looks for and what it ignores
2. **Provide applicability guidance** - Help agents determine if the audit is relevant to their codebase
3. **Focus on high-signal issues** - Avoid noise by targeting patterns with clear improvement paths
4. **Create actionable output** - Audits should generate concrete, implementable ideas
5. **Respect domain differences** - Use examples from multiple languages/frameworks when illustrating patterns
6. **Document the "why"** - Reference relevant principles to explain why the pattern matters
7. **Keep it autonomous** - Agents should be able to execute the audit without human guidance

## Audit Structure

Stock audit templates follow a consistent structure:

- **Title** (H1) - The audit's name
- **Opening description** - What the audit does (1-2 sentences)
- **Hint** - Standard reminder to create ideas rather than modify code
- **Scope** - What to analyze and what patterns to look for
- **Analysis Steps** (optional) - Step-by-step guidance for conducting the review
- **Applicability** (optional) - When this audit applies and when to skip it
- **Blocked By** - Always "(none)" for audits
- **Definition of Done** - Checklist of completion criteria

When creating an audit task from a stock audit, the system automatically adds a "Task Type: implement" section and prefixes the title with "Audit: ".

## Examples

The stock audit library includes diverse patterns:

- **checks-audit** - Analyzes project structure to suggest appropriate checks configuration
- **dead-code** - Finds unused code to improve maintainability
- **flaky-tests** - Detects timing-dependent patterns causing test instability
- **security-review** - Verifies security tooling is configured
- **ubiquitous-language** - Checks terminology consistency across code and docs
- **ideas-from-principles** - Reviews principles to generate improvement ideas

## Related Facts

- [Package Exports](./package-exports.md) - How `@joshski/dust/audits` is exposed
- [Dust Directory Structure](./dust-directory-structure.md) - Where custom audits live
