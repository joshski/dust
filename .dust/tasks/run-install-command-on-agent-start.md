# Run install command automatically on agent start

The `installDependenciesHint` setting is only shown in some key places (like the implement-task template). Sometimes the agent does not see the hint before attempting to run tests or builds, leading to failures because dependencies aren't installed.

## Solution

Change `installDependenciesHint` to `installCommand` and actually run it whenever `dust agent` is invoked. Since `dust agent` is almost always run only once per session (at the start), this ensures dependencies are installed before any other operations.

## Changes needed

1. Rename `installDependenciesHint` to `installCommand` in `DustSettings`
2. Change `detectInstallDependenciesHint` to `detectInstallCommand` - return actual commands (e.g., `bun install`) instead of hints (e.g., `Run \`bun install\``)
3. Modify the `agent` command to execute the install command before showing the greeting
4. Remove the install hint from the `agent-implement-task` template since it now runs automatically
5. Update documentation and tests
