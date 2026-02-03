# Ignore .claude directory in biome

The `.claude` directory contains Claude Code's local settings and should be excluded from Biome linting.

## Change required

In `biome.json` line 6, add `"!.claude"` to the includes array:
```json
"includes": ["**", "!node_modules", "!dist", "!coverage", "!.claude"]
```

## Goals

- [Lint Everything](../goals/lint-everything.md)

## Blocked by

(none)

## Definition of done

- [ ] The `.claude` directory is added to the excludes in `biome.json`
- [ ] All checks pass (`bin/dust check`)
