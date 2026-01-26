# Replace Bun.Glob with Node.js API

Replace the `Bun.Glob` usage in the CLI with a Node.js-compatible implementation using `node:fs/promises` recursive readdir.

This removes the Bun-specific API dependency, making the CLI source code compatible with both Bun and Node.js runtimes.

## Goals

- [Easy Adoption](../goals/easy-adoption.md)

## Blocked by

(none)

## Definition of done

- All `Bun.Glob` usage is removed from CLI source code
- Glob functionality is implemented using `node:fs/promises` with recursive readdir
- The CLI runs correctly with `bun` (existing functionality preserved)
- No new runtime dependencies are introduced
