# Auto-update Loop Dependencies

Automatically install new dependencies when `package.json` changes during `dust loop claude`.

This would make the claude loop "update proof" - allowing seamless upgrades without requiring manual intervention or loop restarts.

## Possible approaches

- Watch for changes to `package.json` and `bun.lockb` between iterations
- Run `bun install` automatically when dependency files change
- Handle the case where `dust` itself is upgraded mid-loop
