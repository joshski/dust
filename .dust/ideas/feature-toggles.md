# Feature Toggles

Support arbitrary feature toggles in [`.dust/config/settings.json`](../config/settings.json) to enable or disable experimental or optional behavior.

## Proposed Format

```json
{
  "featureToggles": {
    "foo-bar": "enabled"
  }
}
```

## Context

The `DustSettings` type (in [`lib/cli/types.ts:33-39`](../../lib/cli/types.ts)) currently supports these keys:
- `dustCommand` - command to invoke dust
- `installCommand` - command to install dependencies
- `checks` - array of quality gate checks
- `eventsUrl` - URL for event streaming
- `extraDirectories` - additional directories to scan

Settings are loaded by `loadSettings` in [`lib/config/settings.ts`](../../lib/config/settings.ts) and validated by `validateSettingsJson`. The `KNOWN_SETTINGS_KEYS` set controls which keys are recognized, and unknown keys produce validation errors.

## Use Cases

- Enable experimental features without breaking existing behavior
- Allow downstream tools (like custom agents or integrations) to query feature state
- Provide a standard way to configure optional behaviors across the dust ecosystem

## Implementation Notes

To add feature toggles:
1. Add `featureToggles` to `KNOWN_SETTINGS_KEYS` in [`lib/config/settings.ts`](../../lib/config/settings.ts)
2. Add validation logic for the `featureToggles` object structure
3. Add `featureToggles?: Record<string, string>` to the `DustSettings` type
4. Update the Configuration System fact ([`lib/config/settings.ts`](../../lib/config/settings.ts) implementation section mentions which keys are validated)

## Open Questions

### What values should feature toggles support?

#### String values only ("enabled"/"disabled")

The original proposal uses string values like `"enabled"`. This keeps parsing simple and allows for future extension to values like `"enabled-with-logging"` or variant names.

Benefits: Matches the proposed format exactly; allows descriptive values beyond boolean.
Costs: Requires string comparison instead of truthy check; potential for typos in value strings.

#### Boolean values

Use `true`/`false` directly:

```json
{
  "featureToggles": {
    "foo-bar": true
  }
}
```

Benefits: Standard JSON boolean type; no string comparison needed; familiar pattern.
Costs: Less expressive; harder to extend to variant toggles later.

#### Union of both

Accept either boolean or string:

```json
{
  "featureToggles": {
    "foo-bar": true,
    "baz-qux": "variant-a"
  }
}
```

Benefits: Flexible; handles both simple on/off and variant toggles.
Costs: More complex validation; API consumers must handle both types.

### Should there be a default toggle state?

#### Absent toggles default to disabled

If a toggle key is not present in the config, treat it as disabled. This is the implicit behavior of checking for a key's presence.

Benefits: Explicit enablement required; minimal config for default behavior.
Costs: No way to express "use the default" vs "explicitly disabled".

#### Absent toggles default to a per-toggle default

Allow the code querying a toggle to specify what the default should be if not configured.

Benefits: Each feature decides its own default; backwards-compatible feature introduction.
Costs: Defaults scattered in code rather than centralized.

### How should downstream tools access toggle state?

#### Via the existing settings API

Downstream tools that already receive `DustSettings` (via `CommandDependencies`) can access `settings.featureToggles?.['foo-bar']`.

Benefits: Consistent with existing patterns; no new API surface.
Costs: Requires knowing the exact toggle key string.

#### Via a dedicated helper function

Provide a utility like `isFeatureEnabled(settings, 'foo-bar')` that handles defaults and type coercion.

Benefits: Encapsulates default logic; easier refactoring if toggle format changes.
Costs: Another function to maintain; minor indirection.

#### Via a command-line query

Add a `dust feature <name>` command that outputs the toggle state, for use in shell scripts or external tools.

Benefits: Accessible to non-TypeScript tools; scriptable.
Costs: Additional command to implement and test; slower than in-process check.
