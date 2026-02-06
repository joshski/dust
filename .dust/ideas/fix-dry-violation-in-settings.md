# Fix DRY violation in settings

The `DUST_EVENTS_URL` environment variable override is applied in three separate code paths. Extracting an `applyEnvOverrides()` function in `lib/config/settings.ts` would consolidate this.
