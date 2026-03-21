# Configuration System

Dust uses a JSON configuration file at `.dust/config/settings.json` to customize behavior.

The `.dust/config/` directory is strictly allowlisted by `dust lint`. Valid entries are:

- `settings.json`
- `audits/`
- `hints/`
- `agents/`
- `container/`

## Settings

### dustCommand

The command used to invoke dust in agent instructions. Auto-detected based on lockfiles if not specified (bun.lock or bun.lockb → `bunx dust`, pnpm-lock.yaml → `pnpx dust`, package-lock.json → `npx dust`).

```json
{
  "dustCommand": "npx dust"
}
```

### installCommand

The command used to install dependencies. Auto-detected based on lockfiles if not specified:

- **JavaScript**: bun.lock or bun.lockb → `bun install`, pnpm-lock.yaml → `pnpm install`, package-lock.json → `npm install`
- **Ruby**: Gemfile.lock → `bundle install`
- **Python**: poetry.lock → `poetry install`, Pipfile.lock → `pipenv install`, requirements.txt → `pip install -r requirements.txt`
- **Go**: go.sum → `go mod download`
- **Rust**: Cargo.lock → `cargo build`
- **PHP**: composer.lock → `composer install`
- **Elixir**: mix.lock → `mix deps.get`

Returns `null` (omits install step) when no lockfile is found or when multiple ecosystems are detected.

```json
{
  "installCommand": "npm install"
}
```

### checks

An array of quality gate checks run by `dust check`. Each check has a `name` and `command`:

```json
{
  "checks": [
    { "name": "lint", "command": "npm run lint" },
    { "name": "test", "command": "npm test" },
    { "name": "build", "command": "npm run build" }
  ]
}
```

Each check can optionally include:

- `hints` — an array of helpful suggestions shown when the check fails
- `timeoutMilliseconds` — override the default timeout (120000ms) for this check

```json
{
  "checks": [
    {
      "name": "lint",
      "command": "npm run lint",
      "hints": ["Run 'npm run lint:fix' to auto-fix issues"],
      "timeoutMilliseconds": 60000
    }
  ]
}
```

Checks run in parallel by default. `dust check` prints per-check status lines progressively as checks become displayable in deterministic order, and also runs `dust lint` as a built-in first check when `.dust/` exists.

This repository's check pipeline includes a distinct formatting check:

- `bunx oxfmt --check --config .oxfmtrc.json ...` for TypeScript/JSON code and config files
- `bun run scripts/lint/check-package-json-format.ts` to preserve canonical `package.json` formatting and key ordering

## Implementation

Settings are loaded by `lib/config/settings.ts`. The `loadSettings` function reads from `.dust/config/settings.json` and returns defaults if the file doesn't exist. Validation is performed by the exported `validateSettingsJson` function, which validates known keys (dustCommand, checks, installCommand, eventsUrl, and deprecated extraDirectories), reports unknown keys, and flags `extraDirectories` as deprecated.

`extraDirectories` no longer affects `.dust/` root path allowlisting in `dust lint`. The `.dust/` root allowlist is fixed to `principles/`, `ideas/`, `tasks/`, `facts/`, `config/`, and `repository.md`.
