# Add Component Reuse Audit

Add a stock audit that helps agents identify opportunities to extract and reuse components in the codebase.

## Overview

Create a new stock audit in `lib/audits/stock-audits.ts` that instructs agents to look for repeated patterns, similar code blocks, and opportunities to extract reusable components. The audit should be language-agnostic, avoiding references to specific types of components (React components, functions, classes, etc.) so it applies to any codebase.

## Implementation

1. Add a `componentReuse` function in `lib/audits/stock-audits.ts` following the existing pattern
2. Register it in `stockAuditFunctions` with the key `'component-reuse'`
3. The audit template should focus on:
   - Finding repeated patterns that could be unified
   - Identifying similar logic across files
   - Spotting copy-pasted code
   - Suggesting extraction opportunities while respecting the "reasonably DRY" principle

## Principles

- [Reasonably DRY](../principles/reasonably-dry.md)
- [Decoupled Code](../principles/decoupled-code.md)
- [Maintainable Codebase](../principles/maintainable-codebase.md)

## Blocked By

(none)

## Definition of Done

- [ ] New `componentReuse()` function added to `lib/audits/stock-audits.ts`
- [ ] Audit registered in `stockAuditFunctions` map
- [ ] Audit template follows the existing format (title, description, scope, principles, blocked by, definition of done)
- [ ] Audit template is language-agnostic (no specific component types mentioned)
- [ ] Audit template references the "reasonably DRY" principle to avoid over-extraction
- [ ] `bin/dust check` passes
