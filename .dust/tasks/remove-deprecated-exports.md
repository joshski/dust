# Remove Deprecated Exports

Remove the `./ideas` and `./workflow-tasks` exports from package.json, completing the migration to the unified `./artifacts` module. This is a breaking change.

## Implementation Notes

- Remove `./ideas` export from package.json
- Remove `./workflow-tasks` export from package.json
- Remove corresponding build steps from build script
- Keep the underlying `lib/ideas.ts` and `lib/workflow-tasks.ts` files (used internally by artifacts.ts)
- Update any internal imports that used the package exports to use relative imports

## Principles

- [Small Units](../principles/small-units.md) - Single unified export is easier to understand

## Blocked By

- [Create Artifacts Repository](create-artifacts-repository.md)

## Definition of Done

- [ ] `./ideas` export removed from package.json
- [ ] `./workflow-tasks` export removed from package.json
- [ ] Build script no longer compiles separate ideas.js and workflow-tasks.js
- [ ] All internal code uses relative imports or `./artifacts` export
- [ ] Tests pass with the new export structure
