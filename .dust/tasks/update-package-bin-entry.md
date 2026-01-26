# Update Package Bin Entry

Update `package.json` to point the `bin.dust` entry at the compiled JavaScript output instead of the TypeScript source.

This ensures that when the package is installed via npm, the CLI works with Node.js out of the box.

## Goals

- [Easy Adoption](../goals/easy-adoption.md)

## Blocked by

- [Add CLI Build Step](add-cli-build-step.md)

## Definition of done

- `package.json` has `bin.dust` pointing to `dist/dust.js`
- Installing the package via npm provides a working `dust` command
- The CLI works with both `node` and `bun` runtimes after installation
