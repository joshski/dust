# Fix DRY violation in settings

This issue is superseded by [Send events to dust bucket host in dust loop](send-events-to-dust-bucket-host-in-dust-loop.md). That idea removes `DUST_EVENTS_URL` and `eventsUrl` entirely.

## Findings

The `DUST_EVENTS_URL` environment variable override is applied in three separate code paths in `lib/config/settings.ts:359,389,403`. The three paths are:

1. **No settings file** (line 350–363) — builds defaults, applies env override
2. **Settings file parsed** (line 365–392) — merges config, applies env override
3. **ENOENT during read** (line 394–407) — builds defaults (identical to path 1), applies env override

Paths 1 and 3 are nearly identical (both build defaults with auto-detected `dustCommand` and `installCommand`), so the duplication extends beyond just the env override.

An `applyEnvOverrides()` helper would consolidate the three-line block, and extracting a `buildDefaultSettings()` helper would consolidate paths 1 and 3. However, per the [Reasonably DRY](../principles/reasonably-dry.md) principle, extracting shared code should only happen when the duplication is truly about the same concept and has proven stable. Since the bucket integration idea removes `eventsUrl` and `DUST_EVENTS_URL` entirely, fixing this DRY violation now would be wasted effort.

**Recommendation:** No action needed. Let the bucket integration idea resolve this naturally.
