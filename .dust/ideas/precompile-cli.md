# Pre-compile CLI for Node.js/Bun Compatibility

The `bin/dust` CLI currently only works with Bun because it uses TypeScript directly and Bun-specific APIs like `Bun.Glob`.

To support consumers using Node.js, pre-compile the CLI to JavaScript with a build step. This would:

- Use `bun build bin/dust --outfile dist/dust.js --target node` to compile TypeScript to JavaScript
- Replace `Bun.Glob` with a Node.js-compatible implementation using recursive `readdir` from `node:fs/promises`
- Change the shebang to `#!/usr/bin/env node` which works in both runtimes
- Update `package.json` to point `bin.dust` at the compiled output

This approach requires no runtime dependencies and works with any npm-compatible package manager. Bun can also execute the compiled JavaScript, so there's no loss of functionality.
