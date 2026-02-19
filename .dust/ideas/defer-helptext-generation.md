# Defer HELPTEXT generation

`lib/cli/main.ts` eagerly generates a module-level `HELP_TEXT` constant at import time. It uses a hardcoded `dustCommand: 'dust'` rather than reading from settings. A comment notes this exists "for backward compatibility in tests."

This is a minor singleton: immutable once created, but generated too early with a hardcoded value that should come from configuration. It means the help text cannot reflect a user's configured command name.

## Possible approach

Generate help text at call time using the configured `dustCommand` from settings, or accept it as a parameter. Remove the module-level constant.
