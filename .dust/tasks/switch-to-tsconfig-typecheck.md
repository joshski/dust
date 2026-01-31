# Switch to tsconfig-based typecheck

Replace the shell glob-based typecheck with a tsconfig.json approach to avoid silent failures.

The current typecheck command in `settings.json` uses a shell glob pattern:

```
bunx tsc --noEmit --skipLibCheck --module esnext --moduleResolution bundler --target esnext lib/**/*.ts
```

This pattern fails silently because Node's `spawn()` uses `/bin/sh` which doesn't support `**` globstar expansion. As a result, files in nested directories like `lib/cli/commands/` are not being type-checked, and the check passes despite 24+ type errors.

## Solution

Replace the command-line glob with a `tsconfig.json` file that explicitly includes all TypeScript files. This avoids shell expansion issues entirely and is the standard approach for TypeScript projects.

## Goals

- [Make Changes with Confidence](../goals/make-changes-with-confidence.md)
- [Fast Feedback](../goals/fast-feedback.md)

## Blocked by

(none)

## Definition of done

- [ ] Create `tsconfig.json` at the project root with appropriate settings
- [ ] Include all `lib/**/*.ts` files in the tsconfig
- [ ] Fix existing type errors in `lib/cli/commands/loop.test.ts` (mock spawn types)
- [ ] Fix existing type errors in `lib/cli/commands/help.test.ts` (missing `chmod` in FileSystem mock)
- [ ] Update `settings.json` typecheck command to use `bunx tsc -p tsconfig.json --noEmit`
- [ ] Verify `bin/dust check` catches type errors when introduced
