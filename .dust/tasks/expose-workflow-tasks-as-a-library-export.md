# Expose workflow-tasks as a library export

Expose `findWorkflowTask` and related types from the `@joshski/dust` package so downstream consumers can import them. Currently the package only builds a CLI entrypoint (`dist/dust.js`) and has `"exports": {}` in `package.json`, so nothing from `lib/workflow-tasks.ts` is importable.

## Technical Details

### New build output

Add a separate build step that bundles `lib/workflow-tasks.ts` into `dist/workflow-tasks.js`, targeting Node. This should sit alongside the existing CLI build and not affect it.

Update the `build` script in `package.json` to include both builds, e.g.:

```
bun build lib/cli/run.ts --target node --outfile dist/dust.js && \
bun build lib/workflow-tasks.ts --target node --outfile dist/workflow-tasks.js && \
...
```

### Type declarations

The current `tsconfig.json` has `"noEmit": true`. Add a secondary config (e.g. `tsconfig.build.json`) that emits declaration files for the library exports, or use a build tool that generates `.d.ts` files. The goal is that `dist/workflow-tasks.d.ts` exists so TypeScript consumers get types.

### Package.json exports

Update `package.json`:

```json
{
  "exports": {
    "./workflow-tasks": {
      "import": "./dist/workflow-tasks.js",
      "types": "./dist/workflow-tasks.d.ts"
    }
  }
}
```

### What to export

The public API surface from `./workflow-tasks` should include:

- `findWorkflowTask` (function)
- `WorkflowTaskMatch` (type)
- `WorkflowTaskType` (type)
- `titleToFilename` (function)
- `FileSystem` (re-exported type from `lib/cli/types.ts`, needed to call `findWorkflowTask`)

### Dependencies

`workflow-tasks.ts` imports `FileSystem` from `./cli/types`. The bundler should inline this dependency since it's just a type interface with no runtime code beyond what `workflow-tasks.ts` itself uses.

## Goals

- [Easy Adoption](../goals/easy-adoption.md)
- [Decoupled Code](../goals/decoupled-code.md)

## Blocked By

(none)

## Definition of Done

- [ ] `bun run build` produces `dist/workflow-tasks.js` alongside `dist/dust.js`
- [ ] `dist/workflow-tasks.d.ts` exists with type declarations for the exported API
- [ ] `package.json` `exports` field maps `"./workflow-tasks"` to the built file and types
- [ ] `findWorkflowTask`, `WorkflowTaskMatch`, `WorkflowTaskType`, `titleToFilename`, and `FileSystem` are importable from `@joshski/dust/workflow-tasks`
- [ ] The CLI entrypoint (`bin/dust`) continues to work as before
- [ ] All existing tests continue to pass
