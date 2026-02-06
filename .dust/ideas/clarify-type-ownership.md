# Clarify type ownership

`DustSettings` and `CheckConfig` are defined in `lib/cli/types.ts` but re-exported from `lib/config/settings.ts`. It's unclear which module "owns" the config types. Moving config-related types to `lib/config/types.ts` and keeping CLI-specific types in `lib/cli/types.ts` would make ownership explicit.
