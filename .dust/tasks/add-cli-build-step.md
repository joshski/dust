# Add CLI Build Step

Add a build step that compiles the TypeScript CLI to JavaScript using `bun build`.

This enables the CLI to run on Node.js without requiring TypeScript compilation at runtime.

## Goals

- [Easy Adoption](../goals/easy-adoption.md)
- [Fast Feedback](../goals/fast-feedback.md)

## Blocked by

- [Replace Bun.Glob with Node.js API](replace-bun-glob-with-node-api.md)

## Definition of done

- A build script compiles `bin/dust` to `dist/dust.js` using `bun build --target node`
- The compiled output has a `#!/usr/bin/env node` shebang
- The compiled JavaScript runs correctly with `node`
- Build command is documented or available via npm script
