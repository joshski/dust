# Make git hooks executable

The git pre-push hook added by `dust agent` cannot be executed because it lacks the executable permission. Git shows this warning:

```
hint: The '.git/hooks/pre-push' hook was ignored because it's not set as executable.
hint: You can disable this warning with `git config set advice.ignoredHook false`.
```

## Problem

The `FileSystem` interface (`lib/cli/types.ts:15`) only supports basic file operations:
- `exists`
- `readFile`
- `writeFile`
- `mkdir`
- `readdir`

The hook installation in `lib/git/hooks.ts` uses `fs.writeFile()` to create the hook file, but there's no way to set the executable bit (chmod +x).

## Solution

1. Extend the `FileSystem` interface with a `chmod` method
2. Update `FileSystemPrimitives` in `lib/cli/entry-wiring.ts` to include the Node.js `chmod` primitive
3. Update `createFileSystem` in `lib/cli/entry-wiring.ts` to expose `chmod`
4. Update `FileSystemEmulator` in `lib/cli/test-utilities.ts` to track and emulate file permissions
5. Update `installHook()` in `lib/git/hooks.ts` to call `chmod` after writing the hook file
6. Add tests to verify hooks are created with executable permissions

## Goals

- [Make Changes with Confidence](../goals/make-changes-with-confidence.md)

## Blocked by

(none)

## Definition of done

- [ ] `FileSystem` interface includes a `chmod(path: string, mode: number): Promise<void>` method
- [ ] `FileSystemEmulator` tracks file permissions and can verify them in tests
- [ ] `installHook()` sets the hook file to mode `0o755` after writing
- [ ] Tests verify that the hook is created with executable permissions
- [ ] Running `dust agent` in a git repo creates an executable pre-push hook
