# Configuration System

Dust uses a JSON configuration file at `.dust/config/settings.json` to customize behavior.

## Settings

### dustCommand

The command used to invoke dust in agent instructions. Defaults to `dust` if not specified.

```json
{
  "dustCommand": "npx dust"
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

Settings are loaded by `lib/config/settings.ts`. The `loadSettings` function reads from `.dust/config/settings.json` and returns defaults if the file doesn't exist. Validation is split into per-key validators (`validateChecksConfig`, `validateExtraDirectories`, `validateDustEventsUrl`) called by the top-level `validateSettingsJson`.
