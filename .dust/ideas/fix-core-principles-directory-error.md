# Fix Core Principles Directory Error

The core principles directory lookup fails in containerized environments, preventing the package from functioning correctly.

## Problem

In some containerized contexts, the core principles directory cannot be found, causing this error:

```
Error: Core principles directory not found at /app/.dust/principles. Ensure the @joshski/dust package is properly installed.
  File "/app/dist/index.js", line 37344, in locatePackagePrinciplesDir
  File "/app/dist/index.js", line 37349, in readAllCorePrinciples
  File "/app/dist/index.js", line 38926, in principlesGet
```

## Context

The error occurs in `lib/core-principles.ts:52-57` when `locatePackagePrinciplesDir()` cannot find the `.dust/principles` directory within the installed npm package.

### Current Implementation

Core principles are exposed via the `@joshski/dust/core-principles` export:

- **Location:** `.dust/principles/` directory in the package
- **Included in npm package:** Yes, via `package.json` `files` array (line 60)
- **Resolution:** Uses `import.meta.url` to locate package root, then joins with `.dust/principles`
- **Approach:** File-system based lookup expecting the directory to exist alongside the built code

The `locatePackagePrinciplesDir()` function (lib/core-principles.ts:41-60):
1. Gets the directory of the currently executing file via `import.meta.url`
2. Goes up one level to reach the package root
3. Joins with `.dust/principles` to find the principles directory
4. Throws an error if the directory doesn't exist

### Where Core Principles Are Used

- **`dust principles` command** (lib/cli/commands/list.ts:402-415) - Lists both core and local principles
- **Core principles filtering** - `readAllCorePrinciples()` loads all principles from the bundled directory
- **Hierarchy display** - `getCorePrincipleHierarchy()` builds tree structure for display

### Why This Might Fail

1. **Build process complexity:** Bundling with Bun might affect how paths resolve
2. **Container environments:** Different runtime environments (e.g., Docker with `/app/` paths) may have different path resolution behavior
3. **npm installation quirks:** Certain npm install modes (linked packages, pnpm, etc.) might not copy the `.dust/principles` directory correctly
4. **Symbolic links:** Package managers sometimes create symlinks that break path resolution

## Open Questions

### Question: Should we bundle principles into the JavaScript bundle?

#### Option: Bundle principles as JavaScript module

Bundle the principles content directly into the compiled JavaScript as string constants or data structures.

**Pros:**
- Eliminates file system dependency entirely
- More reliable across different environments
- Faster (no file I/O)
- Smaller installed package (no separate `.dust/principles` directory)

**Cons:**
- Larger bundle size for the core-principles module
- Less flexible (requires rebuild to update principles)
- Harder to inspect/read principles directly in `node_modules`

#### Option: Keep file-based approach but improve path resolution

Improve the current file-based approach with better error handling and fallback mechanisms.

**Pros:**
- Maintains current architecture
- Principles remain readable as separate markdown files
- Easier to debug (can inspect files directly)
- More transparent to users

**Cons:**
- Still depends on file system being set up correctly
- Doesn't fix underlying issue in problematic environments
- More complex fallback logic needed

### Question: Should we provide multiple resolution strategies?

#### Option: Try multiple resolution strategies with fallbacks

Attempt several different ways to locate principles (relative to module, relative to package.json, bundled as data, etc.).

**Pros:**
- Maximum compatibility across environments
- Graceful degradation
- Helpful error messages can guide users

**Cons:**
- Increased complexity
- Harder to test all paths
- May hide underlying configuration issues

#### Option: Fail fast with clear error message

Keep current approach but improve error message to help diagnose the root cause.

**Pros:**
- Simple, predictable behavior
- Forces users to fix their environment setup
- Easier to debug

**Cons:**
- Less user-friendly
- Doesn't solve the problem for legitimate containerized use cases
- May block valid workflows

### Question: What environments need to be supported?

#### Option: Support all package managers and container environments

Ensure principles work with npm, yarn, pnpm, bun install, Docker, and other containerized environments.

**Pros:**
- Maximum compatibility
- Broader adoption
- Fewer user complaints

**Cons:**
- Increased testing burden
- May require multiple implementation strategies
- Harder to maintain

#### Option: Document supported environments

Clearly document which environments are supported and provide setup guides for others.

**Pros:**
- Clear expectations
- Less maintenance burden
- Focus on primary use cases

**Cons:**
- May exclude legitimate users
- Creates barriers to adoption
- Doesn't solve the core issue
