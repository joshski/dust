# Improve install command output formatting

The install command output in the `agent` command should be more polished and user-friendly.

## Current behavior

```
Running: bun install
bun install v1.3.5 (1e86cebd)

Checked 66 installs across 123 packages (no changes) [17.00ms]
Dependencies installed. Use `bun install` if you need to reinstall.
```

## Desired behavior

```
Installing project dependencies:

> bun install
bun install v1.3.5 (1e86cebd)

Checked 66 installs across 123 packages (no changes) [17.00ms]

✅ Dependencies installed, ready to roll!
```

## Changes required

### `lib/cli/commands/agent.ts`

1. Line 67: Change `Running: ${settings.installCommand}` to a two-line format:
   - `Installing project dependencies:`
   - Empty line
   - `> ${settings.installCommand}`
2. Line 73-74: Add an empty line after the command output (before the success message)
3. Lines 78-80: Change the success message from `Dependencies installed. Use \`${settings.installCommand}\` if you need to reinstall.` to `✅ Dependencies installed, ready to roll!`

### `lib/cli/commands/agent.test.ts`

1. Line 182: Update test assertion from `Running: npm install` to `> npm install`
2. Lines 184-186: Change assertion from checking for `Use \`npm install\` if you need to reinstall` to checking for `Dependencies installed, ready to roll!`
3. Line 202: Update assertion from `Running: npm install` to `> npm install`
4. Line 212: Update assertion from `Running:` to `> ` or `Installing project dependencies`

## Goals

- [Human-AI Collaboration](../goals/human-ai-collaboration.md)

## Blocked by

(none)

## Definition of done

- [ ] Install command shows "Installing project dependencies:" header
- [ ] Command is prefixed with `> ` for shell-like appearance
- [ ] Success message uses emoji and friendlier text
- [ ] Empty line separates output from success message
- [ ] All tests in `agent.test.ts` pass
- [ ] `bin/dust lint` passes
