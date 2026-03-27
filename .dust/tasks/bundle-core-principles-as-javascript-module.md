# Bundle Core Principles as JavaScript Module

Convert core principles from file-system based lookup to bundled JavaScript module. This eliminates directory resolution errors in containerized environments.

## Context

The current implementation uses `locatePackagePrinciplesDir()` to find `.dust/principles/` at runtime, which fails in some containerized environments. Bundling principles directly into the JavaScript eliminates this file system dependency entirely.

## Implementation Approach

1. Create a build-time script that reads all core principles from `.dust/principles/` and generates a TypeScript module exporting them as string constants or data structures
2. Update `lib/core-principles.ts` to import the bundled module instead of using file system operations
3. Remove `locatePackagePrinciplesDir()` and related file system code
4. Update the build process to generate the bundled principles module before compilation
5. Remove `.dust` from `package.json` `files` array since it's no longer needed at runtime

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Context Window Efficiency](../principles/context-window-efficiency.md)
- [Cross-Platform Compatibility](../principles/cross-platform-compatibility.md)

## Task Type

implement

## Blocked By

(none)

## Definition of Done

- Core principles are bundled into JavaScript at build time
- `readAllCorePrinciples()` reads from bundled module instead of file system
- `getCorePrinciplesPath()` is removed (no longer needed)
- Tests pass with bundled principles
- Package size is reasonable (principles add minimal overhead)
- `.dust` directory is removed from `package.json` `files` array
