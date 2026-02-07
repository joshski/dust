# Replace Text Templates with TypeScript Functions

Replace the `.txt` template files and their custom regex engine with TypeScript functions that return strings. This gives us type-checked variables, native JS conditionals, and removes the bespoke `{{variable}}` / `{{#if}}` / `{{#unless}}` syntax.

The main objection to inline template literals in TypeScript is indentation: a multi-line backtick string that starts on a deeply-indented line produces output with unwanted leading whitespace. A small `dedent` tagged template literal solves this. It finds the smallest indentation across non-empty lines, strips that many characters from each line, and trims the result. Roughly:

```typescript
function dedent(strings: TemplateStringsArray, ...values: unknown[]): string {
  let result = strings.reduce((acc, str, i) => acc + str + (values[i] ?? ''), '')
  const lines = result.split('\n')
  const indent = lines
    .filter(line => line.trim())
    .reduce((min, line) => Math.min(min, line.match(/^\s*/)[0].length), Infinity)
  return lines.map(line => line.slice(indent)).join('\n').trim()
}
```

This is simple enough to own rather than pulling in a dependency.

With this in place, a template like `agent-greeting.txt` would become a function:

```typescript
export function agentGreeting(vars: TemplateVars): string {
  return dedent`
    Run \`${vars.bin} next\` to pick your next task.
    ${vars.hooksInstalled ? dedent`
      Your git hooks are installed.
    ` : ''}
  `
}
```

Benefits over the current approach:

- **Type safety** — misspelled variable names are compile errors, not silent empty strings
- **No custom engine** — `processConditionals`, regex substitution, and the `loadTemplate` function all go away
- **No build step for templates** — the `cp -r lib/templates templates` build step and the `templates` entry in `package.json` `files` are no longer needed
- **Native conditionals** — JS `? :` and `&&` replace `{{#if}}` / `{{#unless}}`

## Open Questions

### Should we migrate all templates at once or incrementally?

#### All at once

There are only ~9 template files. Migrating them all in one pass removes the old engine entirely and avoids maintaining two systems in parallel.

#### Incrementally

Migrate one or two templates first to validate the `dedent` approach in practice, then convert the rest. Lower risk but means the custom engine stays around temporarily.
