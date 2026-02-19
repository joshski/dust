# Export idea parser API from @joshski/dust package

Expose the idea parsing helpers from the published package. Downstream projects can reuse the canonical markdown parsing logic instead of duplicating it. Add a public export for the ideas module (including `parseOpenQuestions`, related types, and any required parser helpers) and ensure imports work via package subpath exports.

Update package build + exports wiring so the ideas module is included in `dist/` and declared in `package.json#exports` with matching TypeScript declarations. Preserve existing exports and avoid breaking current import paths.

Document the new import path in package docs/changelog notes and add tests (or update existing tests) that verify the parser behavior remains stable and that exported API surface is usable from consumers.

## Goals

- [Easy Adoption](../goals/easy-adoption.md)
- [Debugging Tooling](../goals/debugging-tooling.md)

## Blocked By

(none)

## Definition of Done

- [ ] `@joshski/dust` exposes the idea parser module via package exports
- [ ] `parseOpenQuestions` and required related types are importable from the published API surface
- [ ] Build pipeline emits runtime + declaration files for the exported ideas module
- [ ] Existing package exports continue to work unchanged
- [ ] Tests cover exported parser behavior and pass
- [ ] Documentation mentions how consumers should import the idea parser
