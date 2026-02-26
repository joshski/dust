# Default install command for non-JS platforms

Extend install command auto-detection to recognize non-JavaScript project types (Rails, Python, Go, etc.).

## Context

Currently, `detectInstallCommand` in `lib/config/settings.ts` only recognizes JavaScript/Node.js lockfiles:

1. `bun.lockb` → `bun install`
2. `pnpm-lock.yaml` → `pnpm install`
3. `package-lock.json` → `npm install`
4. Fallback → `npm install`

When running `dust loop` or `dust focus` on a non-JavaScript repository (Rails, Python, Go, Rust, etc.), the instructions incorrectly tell the agent to run `npm install`, which will fail or produce confusing results.

The `installCommand` is used in `buildImplementationInstructions()` (`lib/cli/commands/focus.ts`) which is called by:
- `dust focus` command
- `dust loop` iterations (via `loop.ts`)

The instructions appear as step 1: "Run \`npm install\` to install dependencies"

### Current behavior with non-JS projects

If a Rails project has no `package.json` or lockfile, the agent receives instructions to run `npm install`, which:
- Fails if npm isn't installed
- Creates an empty `node_modules` folder if npm is installed
- Confuses the agent about what actually needs to happen

### Related configuration

Users can already override this by setting `"installCommand"` in `.dust/config/settings.json`. The question is what should happen when they don't.

## Open Questions

### What should happen when no recognized lockfile is found?

#### Detect platform from other manifest files

Extend detection to recognize common project files:
- `Gemfile.lock` → `bundle install`
- `requirements.txt` or `Pipfile.lock` or `poetry.lock` → `pip install -r requirements.txt` / `pipenv install` / `poetry install`
- `go.mod` → `go mod download`
- `Cargo.lock` → `cargo build`
- `composer.lock` → `composer install`
- `mix.lock` → `mix deps.get`

This provides sensible defaults across ecosystems. The detection order matters when multiple manifest files exist (e.g., a Ruby project with a JavaScript frontend).

#### Return null and omit the install step

If no recognized lockfile is found, `detectInstallCommand` returns `null` and `buildImplementationInstructions` skips step 1 entirely. The agent proceeds directly to running checks.

This is conservative—it doesn't guess wrong—but may leave the agent without installed dependencies if the project needs them.

#### Keep npm install as fallback with a warning

Keep the current behavior but have the loop/focus command log a warning when no lockfile is detected: "No lockfile detected—using npm install. Set installCommand in settings.json for other platforms."

This maintains backward compatibility while making the assumption explicit.

### Should detection prioritize multiple ecosystems?

#### First match wins

Check lockfiles in a fixed priority order (e.g., JS first, then Ruby, then Python, etc.). The first match determines the install command. Simple to implement but arbitrary if multiple ecosystems are present.

#### Require explicit configuration for multi-language repos

If multiple lockfiles from different ecosystems are detected, return `null` and require the user to set `installCommand` explicitly. This avoids guessing wrong in complex projects.

#### Detect the "primary" ecosystem from the task context

Use signals from the current task (file paths, language mentions) to determine which ecosystem's install command to use. More intelligent but significantly more complex and may be unreliable.

### How should multi-stage install workflows be handled?

#### Detect and concatenate multiple commands

If both `Gemfile.lock` and `package-lock.json` exist, set `installCommand` to `bundle install && npm install`. Handles common cases but the combination logic could get complex.

#### Only detect single-ecosystem projects

If multiple ecosystems are detected, don't auto-detect—require explicit configuration. Simpler and forces users of complex projects to be explicit about their needs.
