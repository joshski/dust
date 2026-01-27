# Bootstrap settings.json in dust init

The `dust init` command could create a starter `.dust/config/settings.json` with common quality checks.

## Current Behavior

`dust init` creates the directory structure but no configuration. Users must manually create `settings.json` before `dust check` will work.

## Proposed Behavior

Detect the project type and generate appropriate starter checks:

**Node.js projects (package.json exists):**
```json
{
  "dustCommand": "npx dust",
  "checks": [
    { "name": "test", "command": "npm test" }
  ]
}
```

**Bun projects (bun.lock exists):**
```json
{
  "dustCommand": "bunx dust",
  "checks": [
    { "name": "test", "command": "bun test" }
  ]
}
```

**Generic fallback:**
```json
{
  "dustCommand": "dust",
  "checks": []
}
```

## Benefits

- Reduces friction for new users
- `dust check` works immediately after init
- Demonstrates the configuration pattern
