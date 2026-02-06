# Consolidate duplicate SpawnFn types

`SpawnFn` is defined identically in both `check.ts` (line 34) and `pre-push.ts` (line 24). This should live in a single shared location.
