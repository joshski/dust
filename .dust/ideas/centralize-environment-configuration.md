# Centralize environment configuration

Replace scattered `process.env` access with explicit configuration objects to improve testability and make environment dependencies visible.

## Current State

The codebase accesses `process.env` in 12+ files across different subsystems:

### Configuration at startup
- `lib/config/settings.ts:228,328` - `BUN_INSTALL` for runtime detection
- `lib/config/settings.ts:359,389,403` - `DUST_EVENTS_URL` override (DRY violation documented in [Fix DRY violation in settings](fix-dry-violation-in-settings.md))

### Runtime behavior
- `lib/logging/index.ts:94,110` - `DEBUG` patterns, `DUST_LOG_DIR`/`DUST_LOG_FILE`
- `lib/cli/run.ts:20-21` - `DUST_EVENTS_FD` for event streaming
- `lib/claude/vcr.ts:66` - `CLAUDE_CODE_VCR_MODE` for test recording
- `lib/bucket/repository-loop.ts`, `lib/loop/loop.ts` - `CLAUDE_CODE_OAUTH_TOKEN` check
- `lib/cli/commands/bucket.ts:315,985` - `DUST_BUCKET_AGENT_CONNECT_URL`, `DUST_BUCKET_TOKEN`
- `lib/cli/commands/bucket-asset-upload.ts:148` - `DUST_BUCKET_TOKEN`

### Test setup/teardown
- Multiple test files stub and restore `process.env` manually (see [Refactor test env stubbing](refactor-test-env-stubbing-to-avoid-global-state.md))

## Problems

1. **Hidden dependencies** - Reading `process.env` inside functions creates implicit dependencies. Callers cannot see what environment variables affect behavior without reading the implementation.

2. **Test complexity** - Tests must stub global state and remember to restore it. Some tests miss cleanup, risking pollution.

3. **Inconsistent patterns** - Some modules accept env as a parameter (e.g., `bucketAssetUpload(..., env = process.env)`), others read directly. The mix makes auditing environment usage difficult.

4. **No single source of truth** - Environment variable names are string literals scattered across the codebase. A typo creates a silent failure.

## Open Questions

### How should environment configuration be centralized?

#### Create an EnvConfig type and read once at startup

Define a typed configuration object with all recognized environment variables. Read `process.env` once at CLI entry and pass the config down. Functions receive the typed config instead of reading `process.env` directly.

Benefits: Explicit dependencies, type-safe access, single source of truth for variable names.
Costs: Requires threading config through call chains; some values are inherently lazy (e.g., `DEBUG` pattern matching).

#### Create environment accessor modules per subsystem

Each subsystem (logging, bucket, settings) defines its own typed accessor that reads from `process.env`. Centralizes the string literals per module without requiring a global config object.

Benefits: Localized changes; modules remain self-contained.
Costs: Still implicit dependencies at module boundaries.

#### Keep direct access but document in session.ts

The `lib/session.ts` file already exports `DUST_UNATTENDED`, `DUST_SKIP_AGENT`, `DUST_REPOSITORY_ID` as constants. Expand this pattern to all environment variables. Code uses the constants rather than string literals.

Benefits: Minimal change to control flow; typos become compile errors.
Costs: Doesn't address testability or hidden dependency issues.

#### Accept scattered access with documentation

Document all environment variables in a single README section or `.dust/facts/` file. Maintain a checklist for auditing. Accept that some access patterns are inherently global.

Benefits: No code changes required.
Costs: Documentation may drift; testability issues remain.
