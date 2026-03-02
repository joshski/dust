# Remove npm install fallback

When dust cannot auto-detect how to install dependencies, it should not fall back to `npm install`. The current behavior is surprising and potentially incorrect.

## Context

The dependency installation detection in `lib/config/settings.ts` works correctly:

- `detectInstallCommand()` (line 269) returns `null` when:
  1. No recognized lockfile is found
  2. Multiple ecosystems are detected (e.g., both `package-lock.json` and `Gemfile.lock`)
- `loadSettings()` correctly leaves `installCommand` undefined when detection returns `null`

However, the `loop.ts` command at line 424 introduces a problematic fallback:

```typescript
const { dustCommand, installCommand = 'npm install' } = dependencies.settings
```

This means:
- A Python-only project (with `requirements.txt`) → works correctly (`pip install -r requirements.txt`)
- A multi-language project (JS + Ruby) → falls back to `npm install`, which is wrong
- A project with no lockfiles → falls back to `npm install`, which may not be what the user wants

The fallback contradicts the careful `null` handling in `detectInstallCommand()`.

## Proposed Solution

Remove the `= 'npm install'` fallback. When `installCommand` is undefined:
- The `buildImplementationInstructions()` function in `focus.ts` (line 29) already handles this correctly by conditionally including the install step only when `installCommand` is truthy
- The loop should pass `undefined` to `buildImplementationInstructions()`, which will omit the install step from the agent's instructions

This aligns with the [Unsurprising UX](../principles/unsurprising-ux.md) principle: if dust cannot confidently determine the install command, it should not guess.

## Open Questions

### What should happen when install command is ambiguous?

#### Skip installation entirely

Don't include an install step in the agent instructions when the install command cannot be determined. This is the simplest approach and avoids running the wrong command. Users with complex setups likely have explicit `installCommand` in settings anyway.

However, dependencies may not be installed, causing task failures, and the agent may waste time troubleshooting missing dependencies.

#### Run all detected ecosystem installers

When multiple ecosystems are detected, run each ecosystem's install command in sequence. The original idea suggested: "Perhaps we should perform _all_ installers if [in] doubt?" This approach is more likely to result in a working state and handles polyglot repositories correctly.

However, it may run unnecessary commands, order of execution could matter for some setups, and some installers (like `cargo build`) do more than just install dependencies.

#### Prompt user to configure installCommand

When ambiguous, output a warning suggesting the user add `installCommand` to settings. This forces explicit configuration for complex projects and is one-time friction that leads to correct behavior forever.

However, it interrupts workflow and it may not be obvious what command to use.

### Should we distinguish "no lockfiles" from "multiple ecosystems"?

#### Treat them identically

No lockfiles and multiple ecosystems both result in no install step. This is simpler to implement and provides consistent behavior.

However, "no lockfiles" might mean "npm install is actually fine" for a fresh JavaScript project.

#### Different handling for each case

"No lockfiles" could have a different default or warning than "multiple ecosystems". This provides more nuanced behavior and could provide more helpful error messages.

However, it requires more complex logic and multiple code paths to maintain.
