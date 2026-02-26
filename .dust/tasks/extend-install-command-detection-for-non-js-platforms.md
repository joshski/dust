# Extend install command detection for non-JS platforms

Extend `detectInstallCommand` in `lib/config/settings.ts` to recognize non-JavaScript project types and return appropriate install commands.

## Context

Currently, `detectInstallCommand` only recognizes JavaScript/Node.js lockfiles (`bun.lockb`, `pnpm-lock.yaml`, `package-lock.json`). When running `dust loop` or `dust focus` on a non-JavaScript repository, the agent receives incorrect instructions to run `npm install`.

## Implementation

Extend the detection order in `detectInstallCommand`:

1. JavaScript (existing):
   - `bun.lockb` → `bun install`
   - `pnpm-lock.yaml` → `pnpm install`
   - `package-lock.json` → `npm install`

2. Ruby:
   - `Gemfile.lock` → `bundle install`

3. Python:
   - `poetry.lock` → `poetry install`
   - `Pipfile.lock` → `pipenv install`
   - `requirements.txt` → `pip install -r requirements.txt`

4. Go:
   - `go.sum` → `go mod download`

5. Rust:
   - `Cargo.lock` → `cargo build`

6. PHP:
   - `composer.lock` → `composer install`

7. Elixir:
   - `mix.lock` → `mix deps.get`

8. No recognized lockfile → return `null`

When multiple lockfiles from different ecosystems exist, return `null` to require explicit `installCommand` configuration.

Update `buildImplementationInstructions()` in `lib/cli/commands/focus.ts` to skip the install step when `installCommand` is `null`.

## Principles

- [Easy Adoption](../principles/easy-adoption.md)
- [Unsurprising UX](../principles/unsurprising-ux.md)
- [Agent Autonomy](../principles/agent-autonomy.md)

## Blocked By

(none)

## Definition of Done

- [ ] `detectInstallCommand` recognizes Ruby, Python, Go, Rust, PHP, and Elixir lockfiles
- [ ] Returns `null` when no lockfile is found (instead of defaulting to `npm install`)
- [ ] Returns `null` when multiple ecosystems are detected
- [ ] `buildImplementationInstructions` handles `null` installCommand by omitting the install step
- [ ] Unit tests cover each supported ecosystem
- [ ] Unit tests cover the multi-ecosystem and no-lockfile cases
