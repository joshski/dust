# Rename "lint typescript" check to "lint (biome)"

The check configuration in `.dust/config/settings.json` has a check named "lint typescript" that runs `bunx biome check .`. The name should be updated to "lint (biome)" for consistency with other checks that use the pattern `name (tool)` (e.g., "tests (vitest)", "tests (bun)").

## Change required

In `.dust/config/settings.json` line 5, change:
```json
"name": "lint typescript",
```
to:
```json
"name": "lint (biome)",
```

## Goals

- [Lint Everything](../goals/lint-everything.md)

## Blocked by

(none)

## Definition of done

- [ ] The check name in `.dust/config/settings.json` is changed from "lint typescript" to "lint (biome)"
- [ ] All checks pass (`bin/dust check`)
