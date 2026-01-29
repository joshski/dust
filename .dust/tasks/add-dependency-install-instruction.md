# Add dependency install instruction to implement task

When an agent runs `dust agent implement task`, the instructions should include a step to ensure dependencies are installed before starting implementation. This prevents failures mid-implementation due to missing dependencies.

## Behavior

### Template changes

Update `lib/templates/agent-implement-task.txt` to include a new step at the beginning:

1. {{installDependenciesHint}} (unless already installed)

This step should come before "Run `{{bin}} check`" since the check commands typically require dependencies to be present.

### Template rendering

The `{{installDependenciesHint}}` placeholder should be populated from the settings:

1. If `installDependenciesHint` is configured in `.dust/config/settings.json`, use that value
2. If not configured, use auto-detection based on lockfiles:
   - `bun.lockb` or `bun.lock` exists → "Run \`bun install\`"
   - `pnpm-lock.yaml` exists → "Run \`pnpm install\`"
   - `package-lock.json` exists → "Run \`npm install\`"
   - `yarn.lock` exists → "Run \`yarn install\`"
   - No lockfile → "Install any dependencies"

### Implementation

1. Add a `detectInstallDependenciesHint` function to `lib/cli/settings.ts` that auto-detects based on lockfiles
2. Update `loadSettings` to use this function when `installDependenciesHint` is not configured
3. Update the template rendering in the agent command to pass `installDependenciesHint` as a context variable
4. Update the template to include the new instruction step

## Goals

- [Easy Adoption](../goals/easy-adoption.md)
- [Agent Autonomy](../goals/agent-autonomy.md)
- [Fast Feedback](../goals/fast-feedback.md)

## Blocked by

(none)

## Definition of done

- [ ] `lib/cli/settings.ts` has a `detectInstallDependenciesHint` function
- [ ] `loadSettings` uses auto-detection when `installDependenciesHint` is not configured
- [ ] `agent-implement-task.txt` template includes the dependency install instruction
- [ ] Template rendering passes `installDependenciesHint` to the implement task template
- [ ] Auto-detection correctly identifies bun, pnpm, npm, and yarn based on lockfiles
- [ ] Configured hint takes precedence over auto-detection
- [ ] Tests cover the auto-detection logic and template rendering
