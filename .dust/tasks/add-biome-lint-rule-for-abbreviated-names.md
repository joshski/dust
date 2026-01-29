# Add Biome lint rule for abbreviated names

Add linting to prevent common abbreviated variable names that reduce code clarity.

## Context

The codebase follows a "clarity over brevity" philosophy. Names like `ctx`, `deps`, `fs`, `args`, `req`, `res`, `err`, `cb`, `fn`, `opts`, and similar abbreviations should be replaced with their full forms:

- `ctx` → `context`
- `deps` → `dependencies`
- `fs` → `fileSystem`
- `args` → `arguments`
- `req` → `request`
- `res` → `response`
- `err` → `error`
- `cb` → `callback`
- `fn` → `function` (or a more descriptive name)
- `opts` → `options`
- `config` → `configuration` (if ambiguous)
- `params` → `parameters`
- `obj` → use a descriptive name
- `val` → `value`
- `idx` → `index`
- `len` → `length`
- `tmp` → use a descriptive name
- `str` → `string` or descriptive name
- `num` → `number` or descriptive name

## Implementation approach

Biome doesn't have a built-in rule to ban specific identifier names. Options to explore:

1. **Biome plugin** - Biome 2.x supports plugins written in GritQL. Investigate whether a custom plugin can match and report on specific identifier patterns.

2. **useNamingConvention rule** - Check if Biome's `useNamingConvention` rule can be configured with custom regex patterns to reject abbreviated names.

3. **Alternative tooling** - If Biome cannot support this, consider ESLint with `eslint-plugin-id-length` or a custom ESLint rule, potentially running alongside Biome.

## Files to modify

- `biome.json` - Add the new rule configuration
- Potentially add a Biome plugin file if using the plugin approach

## Goals

- [Clarity Over Brevity](../goals/clarity-over-brevity.md)

## Blocked by

(none)

## Definition of done

- [ ] Research and document the best approach for Biome
- [ ] Implement the lint rule configuration
- [ ] Verify the rule catches abbreviated names in variable declarations, function parameters, and destructuring
- [ ] Update any existing code that violates the new rule
- [ ] Document the rule in the codebase (e.g., in CLAUDE.md or a linting guide)
