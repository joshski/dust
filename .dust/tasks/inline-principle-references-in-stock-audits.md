# Inline principle references in stock audits

Replace relative markdown links to principles in stock audits with inlined principle summaries. This makes stock audits self-contained and prevents broken links when distributed to downstream repositories via the `@joshski/dust/audits` npm package export.

## Context

Stock audits in `lib/audits/stock-audits.ts` contain 8 relative markdown links to principle files:
- Fast Feedback Loops (3 references at lines 552, 2383)
- Comprehensive Assertions (3 references at lines 1645, 1704, 1731)
- Self-Diagnosing Tests (1 reference at line 1645)
- Reproducible Checks (1 reference at line 2269)
- Stop the Line (1 reference at line 2359)
- Traceable Decisions (1 reference at line 2422)

These links break in downstream repositories because those repos don't have the dust repository's principle files at `../principles/`.

## Approach

For each principle link, replace the markdown link with the one-sentence core message from the principle, optionally adding a brief elaboration if needed for clarity. Remove all link syntax entirely.

Example transformation:

Before:
```markdown
The [Fast Feedback Loops](../principles/fast-feedback-loops.md) principle emphasizes that the primary feedback loop—write code, run checks, see results—should be as fast as possible.
```

After:
```markdown
The primary feedback loop—write code, run checks, see results—should be as fast as possible.
```

Before:
```markdown
The [Comprehensive Assertions](../principles/comprehensive-assertions.md) principle covers asserting whole objects rather than fragments.
```

After:
```markdown
Comprehensive assertions (asserting whole objects rather than fragments) provide richer failure diagnostics.
```

## Principles

### Functional Core, Imperative Shell

Separate code into a pure "functional core" and a thin "imperative shell." The core takes values in and returns values out, with no side effects. The shell handles I/O and wires things together.

### Agent Autonomy

Dust exists to enable AI agents to produce work autonomously.

### Context Window Efficiency

Dust should be designed with short attention spans in mind. AI agents operate within limited context windows. Every token consumed by planning artifacts is a token unavailable for reasoning about code. Dust keeps artifacts concise and scannable so agents can quickly understand what needs to be done without wading through verbose documentation.

## Task Type

implement

## Blocked By

(none)

## Blocks

(none)

## Repository Hints

Really think about "Functional Core, Imperative Shell"

## Definition of Done

- All 8 principle links in `lib/audits/stock-audits.ts` are replaced with inlined summaries
- No relative markdown links to `../principles/` remain in the file
- Inlined text preserves the reasoning that makes audits valuable
- Audit text remains clear and self-contained
- Tests pass
- Changes are committed with deletion of this task file and the source idea file
