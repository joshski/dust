# Type safe templates

Replace the current string-based template system with type-safe TypeScript functions. Leverage template literals and a `dedent` helper for readable multi-line strings.

## Current State

The codebase uses a custom template engine (`lib/cli/templates.ts`) that:

- Loads `.txt` files from `lib/templates/`
- Substitutes `{{variable}}` placeholders with string values
- Supports `{{#if variable}}...{{/if}}` and `{{#unless variable}}...{{/unless}}` conditionals
- Uses `Record<string, string>` for variables with no compile-time validation

Template variables are constructed via `templateVariables()` in `lib/cli/commands/agent-shared.ts`, which returns an object with string-typed values (including booleans encoded as `'true'`/`'false'`).

## Problems with Current Approach

1. **No compile-time safety**: Misspelled variable names become silent empty strings
2. **String-encoded booleans**: Variables like `hooksInstalled` must be `'true'`/`'false'` strings to work with the template conditionals, which is error-prone
3. **Custom regex engine**: The `processConditionals` function duplicates logic that JavaScript conditionals handle natively
4. **Build step required**: Templates must be copied to `dist/templates/` during build
5. **Awkward step numbering**: The `agent-implement-task.txt` template has complex conditional step numbering (`{{#unless hooksInstalled}}5.{{/unless}}{{#if hooksInstalled}}5.{{/if}}`) that would be cleaner in code

## Proposed Solution

Replace templates with TypeScript functions using a `dedent` tagged template literal:

```typescript
function dedent(strings: TemplateStringsArray, ...values: unknown[]): string {
  const result = strings.reduce((acc, str, i) => acc + str + (values[i] ?? ''), '')
  const lines = result.split('\n')
  const indent = lines
    .filter(line => line.trim())
    .reduce((min, line) => Math.min(min, line.match(/^\s*/)?.[0].length ?? 0), Infinity)
  return lines.map(line => line.slice(indent)).join('\n').trim()
}

interface TemplateVars {
  bin: string
  agentName: string
  hooksInstalled: boolean  // Real boolean, not string
  isClaudeCodeWeb: boolean
  agentInstructions?: string
}

export function agentGreeting(vars: TemplateVars): string {
  return dedent`
    Hello ${vars.agentName}, welcome to dust!

    Run \`${vars.bin} next\` to pick your next task.
    ${vars.agentInstructions ? `\n---\n\n${vars.agentInstructions}` : ''}
  `
}
```

## Benefits

- **Compile-time safety**: TypeScript catches variable name typos and type mismatches
- **Native booleans**: Use `if (vars.hooksInstalled)` instead of string comparisons
- **Native conditionals**: JavaScript `? :` and `&&` replace custom `{{#if}}`/`{{#unless}}`
- **No custom engine**: `processConditionals`, regex substitution, and `loadTemplate` all go away
- **No build step**: No need to copy template files to dist
- **Better step numbering**: Numbered lists can be computed dynamically

## Related Goals

- [Make Changes with Confidence](../goals/make-changes-with-confidence.md): Type safety enables safe refactoring
- [Minimal Dependencies](../goals/minimal-dependencies.md): The `dedent` helper is simple enough to own (~10 lines)
- [Maintainable Codebase](../goals/maintainable-codebase.md): Removing custom parsing logic simplifies the codebase

## Related Ideas

- [Replace Text Templates with TypeScript Functions](replace-text-templates-with-typescript-functions.md): This idea overlaps significantly - the two should be merged or one subsumed
- [Add Template Name Validation](add-template-name-validation.md): This becomes unnecessary if templates are functions (no string names to validate)

## Open Questions

### Should this idea subsume or replace the existing "Replace Text Templates" idea?

The ideas are nearly identical. The main difference is emphasis: this idea focuses on "type safety" while the existing one focuses on "TypeScript functions." They propose the same solution (`dedent` + function templates) with the same benefits.

#### Merge into this idea and delete the other

#### Keep both and implement together

#### Treat this as a duplicate and close it

### What should the `dedent` implementation handle?

The simple version strips common leading whitespace. Additional considerations: mixed tabs/spaces, preserving intentional indentation relative to the baseline, normalizing line endings.

#### Simple version (strip common leading whitespace only)

#### Full-featured (handle all edge cases above)

### Where should template functions live?

#### Inline in the command files that use them

E.g., `agent.ts` owns its greeting.

#### Centralized in `lib/cli/templates.ts` as functions instead of `loadTemplate`

#### New file per template domain

E.g., `lib/cli/agent-templates.ts`.

### Should this obsolete the "Add Template Name Validation" idea?

If templates become functions, string-based template names disappear. The validation idea would no longer be relevant.

#### Yes, close it as part of implementing this

#### No, keep it independent
