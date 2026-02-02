# Remove install step from dust agent

The `dust agent` command currently auto-detects and runs a package manager install command (e.g., `npm install`, `bun install`). This was originally designed for convenience but creates a problematic workflow:

1. In most projects, you cannot run `dust agent` until dust is already installed via `npm install @joshski/dust` or similar
2. Running install again from within `dust agent` is redundant and adds unnecessary delay
3. It encourages global installation of dust, which we want to discourage

The install step only makes sense in the dust repository itself, where development uses `bin/dust agent` before packages are installed. For all other projects, installation must happen before `dust agent` can run.

## Files to change

### Remove install functionality
- `lib/cli/commands/agent.ts` - Remove install runner logic (lines 64-83), remove `InstallRunner` interface and `createInstallRunner` function
- `lib/cli/commands/agent.test.ts` - Remove tests for install command execution (the `describe('install command execution')` block)

### Remove installCommand from settings
- `lib/cli/types.ts` - Remove `installCommand` from the settings type
- `lib/config/settings.ts` - Remove `detectInstallCommand` function and all references to `installCommand`
- `lib/config/settings.test.ts` - Remove all `installCommand` related tests
- `lib/cli/commands/init.ts` - Remove `installCommand` from generated settings
- `.dust/config/settings.json` - Remove the `installCommand` field

### Update documentation
- `.dust/facts/configuration-system.md` - Remove the `installCommand` section
- `lib/templates/claude-md.txt` - Update to mention running install command before `dust agent`
- `lib/templates/agents-md.txt` - Update to mention running install command before `dust agent`
- `CLAUDE.md` - Update to mention running `bun install` before `bin/dust agent`
- `AGENTS.md` - Update to mention running `bun install` before `bin/dust agent`

## Goals

- [Easy Adoption](../goals/easy-adoption.md)

## Blocked by

(none)

## Definition of done

- [ ] `dust agent` no longer runs any install command
- [ ] `installCommand` is removed from settings type and detection logic
- [ ] `settings.json` no longer contains `installCommand`
- [ ] `dust init` no longer generates `installCommand` in settings
- [ ] Documentation (CLAUDE.md, AGENTS.md, templates) instructs users to install dependencies before running `dust agent`
- [ ] Configuration system fact no longer documents `installCommand`
- [ ] All tests pass with `bun run test`
- [ ] Build succeeds with `bun run build`
