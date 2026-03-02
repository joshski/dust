# Remove npm install fallback

Remove the `= 'npm install'` default from `loop.ts`. When `installCommand` is undefined, no install step should appear in agent instructions.

## Context

The `detectInstallCommand()` function in `lib/config/settings.ts` returns `null` when:
1. No recognized lockfile is found
2. Multiple ecosystems are detected (e.g., both `package-lock.json` and `Gemfile.lock`)

However, `loop.ts:424` introduces a fallback:

```typescript
const { dustCommand, installCommand = 'npm install' } = dependencies.settings
```

This causes `npm install` to run in situations where it may be wrong (multi-language projects) or unwanted (projects with no lockfiles).

## Implementation

Change line 424 in `lib/cli/commands/loop.ts` from:

```typescript
const { dustCommand, installCommand = 'npm install' } = dependencies.settings
```

to:

```typescript
const { dustCommand, installCommand } = dependencies.settings
```

The `buildImplementationInstructions()` function in `focus.ts` already handles `undefined` correctly by omitting the install step.

## Principles

- [Unsurprising UX](../principles/unsurprising-ux.md)

## Blocked By

(none)

## Definition of Done

- [ ] The `= 'npm install'` fallback is removed from `loop.ts`
- [ ] Tests pass
- [ ] When `installCommand` is undefined, no install step appears in agent instructions
