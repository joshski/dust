# Hints for how to fix failures when specific checks fail

When a check fails (like biome, eslint, or tests), show contextual hints about how to fix the issue. For example, when biome check fails, show the command to automatically fix checks where possible (`biome check --write`).

Options:
- Add a hints section to check configuration that gets displayed on failure
- Parse common check output patterns and suggest relevant fix commands
- Include links to documentation for manual fixes
