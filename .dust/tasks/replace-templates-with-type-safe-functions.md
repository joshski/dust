# Replace templates with type-safe functions

Replace the `.txt` template files and custom regex template engine with TypeScript functions that return strings. This gives compile-time type safety, native JavaScript conditionals, and removes the bespoke `{{variable}}`/`{{#if}}`/`{{#unless}}` syntax.

## Context

The current template system (`lib/cli/templates.ts`) loads `.txt` files and substitutes variables using regex. Problems:
- Misspelled variable names become silent empty strings (no compile-time safety)
- Booleans must be encoded as `'true'`/`'false'` strings for conditionals
- Custom regex engine duplicates logic JavaScript handles natively
- Build step required to copy templates to `dist/templates/`

## Implementation

1. Add a `dedent` tagged template literal helper (simple version - strip common leading whitespace only):

   ```typescript
   function dedent(strings: TemplateStringsArray, ...values: unknown[]): string {
     const result = strings.reduce((acc, str, i) => acc + str + (values[i] ?? ''), '')
     const lines = result.split('\n')
     const indent = lines
       .filter(line => line.trim())
       .reduce((min, line) => Math.min(min, line.match(/^\s*/)?.[0].length ?? 0), Infinity)
     return lines.map(line => line.slice(indent)).join('\n').trim()
   }
   ```

2. Convert each template to a typed function inline in its command file:
   - `agent-greeting.txt` → function in `lib/cli/commands/agent.ts`
   - `agent-implement-task.txt` → function in `lib/cli/commands/next.ts` or its current location
   - `agent-new-goal.txt` → function in `lib/cli/commands/new-goal.ts`
   - `agent-new-idea.txt` → function in `lib/cli/commands/new-idea.ts`
   - `agent-new-task.txt` → function in `lib/cli/commands/new-task.ts`
   - `agent-pick-task.txt` → function in `lib/cli/commands/pick-task.ts`
   - `agents-md.txt` → function in `lib/cli/commands/init.ts`
   - `claude-md.txt` → function in `lib/cli/commands/init.ts`
   - `help.txt` → function in `lib/cli/main.ts`

3. Define typed interfaces for template variables (e.g., `TemplateVars`) with real booleans instead of string-encoded booleans

4. Delete:
   - `lib/cli/templates.ts` (the template engine)
   - `lib/templates/` directory (all `.txt` files except `audits/`)
   - Build step that copies templates to `dist/templates/`

5. Update `lib/cli/commands/agent-shared.ts` to use typed interfaces instead of `Record<string, string>`

Note: The `audits/` templates are a separate concern and should be addressed in a follow-up task if needed.

## Goals

- [Make Changes with Confidence](../goals/make-changes-with-confidence.md)
- [Minimal Dependencies](../goals/minimal-dependencies.md)
- [Maintainable Codebase](../goals/maintainable-codebase.md)

## Blocked By

(none)

## Definition of Done

- [ ] All `.txt` templates (except audits/) are replaced with typed TypeScript functions
- [ ] `lib/cli/templates.ts` is deleted
- [ ] Template variables use typed interfaces with real booleans
- [ ] No build step for copying templates
- [ ] All tests pass
- [ ] TypeScript compiler catches misspelled variable names
