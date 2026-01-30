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

### installDependenciesHint

A hint shown to agents about how to install dependencies. Defaults to "Install any dependencies" if not specified. On `dust init`, this is auto-detected based on project type (e.g., "Run \`npm install\`").

```json
{
  "installDependenciesHint": "Run `npm install`"
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

Checks run in parallel with buffered output. The `dust check` command also runs `dust lint markdown` as a built-in check.

## Implementation

Settings are loaded by `lib/cli/settings.ts`. The `loadSettings` function reads from `.dust/config/settings.json` and returns defaults if the file doesn't exist.
