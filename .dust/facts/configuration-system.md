# Configuration System

Dust uses a JSON configuration file at `.dust/config/settings.json` to customize behavior.

## Settings

### dustCommand

The command used to invoke dust in agent instructions. Auto-detected based on lockfiles if not specified (bun.lockb → `bunx dust`, pnpm-lock.yaml → `pnpx dust`, package-lock.json → `npx dust`).

```json
{
  "dustCommand": "npx dust"
}
```

### installCommand

The command used to install dependencies. Auto-detected based on lockfiles if not specified:

- **JavaScript**: bun.lockb → `bun install`, pnpm-lock.yaml → `pnpm install`, package-lock.json → `npm install`
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

Each check can optionally include a `hints` array with helpful suggestions shown when the check fails:

```json
{
  "checks": [
    {
      "name": "lint",
      "command": "npm run lint",
      "hints": ["Run 'npm run lint:fix' to auto-fix issues"]
    }
  ]
}
```

Checks run in parallel with buffered output. The `dust check` command also runs `dust lint` as a built-in check.

## Implementation

Settings are loaded by `lib/config/settings.ts`. The `loadSettings` function reads from `.dust/config/settings.json` and returns defaults if the file doesn't exist. Validation is performed by the exported `validateSettingsJson` function, which validates all known keys (dustCommand, checks, extraDirectories, installCommand, eventsUrl) and reports unknown keys.
