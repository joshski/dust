# Shell expansion in check commands

Check commands may silently fail due to shell differences between [`/bin/sh`](../../../../../bin/sh) and interactive shells.

## Problem

Check commands in `settings.json` are executed via Node's `spawn()` with `shell: true`, which uses [`/bin/sh`](../../../../../bin/sh). This shell lacks features that users might expect from their interactive shell (bash/zsh), leading to **silent failures** where commands appear to pass but actually check fewer files than intended.

## Silent failure patterns

### 1. Globstar `**`

The `**` pattern for recursive directory matching doesn't work in [`/bin/sh`](../../../../../bin/sh):

```
# /bin/sh (what spawn uses)
$ echo lib/**/*.ts | wc -w
27

# zsh (interactive shell)
$ echo lib/**/*.ts | wc -w
59
```

This caused the typecheck to miss all files in nested directories like [`lib/cli/commands/`](../../lib/cli/commands).

### 2. Brace expansion `{a,b}`

Brace expansion is not a POSIX feature:

```
# /bin/sh - braces not expanded, literal {ts,js} passed through
$ echo lib/*.{ts,js}
lib/main.ts lib/run.ts lib/*.js

# zsh - braces expanded
$ echo lib/*.{ts,js}
lib/main.ts lib/run.ts lib/main.js lib/run.js
```

## Features that work correctly

These POSIX features work the same in both shells:
- Tilde expansion (`~`)
- Variable substitution (`${VAR:-default}`)
- Arithmetic (`$((1+1))`)
- Command substitution (`$(command)`)
- Simple globs (`*`, `?`, `[abc]`)

## Potential solutions

1. **Validate check commands** - Warn when commands contain unquoted `**` or `{a,b}` patterns
2. **Quote globs** - Use `"lib/**/*.ts"` so tools expand globs themselves (tsc, eslint do this)
3. **Use config files** - e.g., `tsc -p tsconfig.json` instead of command-line globs
4. **Change the runner** - Use zsh on macOS, or parse and quote globs automatically

The most robust approach for TypeScript is using `tsconfig.json` which avoids shell issues entirely.
