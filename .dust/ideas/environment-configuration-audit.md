# Environment Configuration Audit

Add a stock audit that reviews environment variables and configuration for consistency, correctness, and opportunities to improve configurability.

## Motivation

Environment configuration is a common source of subtle bugs and deployment issues. The dust codebase has evolved a centralized environment configuration system (`lib/env-config.ts`) but not all code uses it consistently. Configuration mistakes can lead to:

- Production failures when environment variables are missing or misconfigured
- Difficult-to-diagnose bugs when code bypasses the typed configuration system
- Security issues when sensitive values are logged or exposed
- Test flakiness when environment state leaks between tests
- Documentation drift when new environment variables aren't added to the central registry

An audit can systematically identify these issues and create ideas for improvements.

## Scope

This audit should review:

1. **Environment variable consistency** - All environment variable usage, comparing direct `process.env` access against the centralized `EnvConfig` system
2. **Configuration completeness** - Whether all used environment variables are documented in `env-config.ts`
3. **Validation and defaults** - Whether environment variables have appropriate validation, type conversion, and default values
4. **Configuration security** - Whether sensitive values (tokens, API keys) are handled securely and not logged
5. **Documentation drift** - Whether environment variable documentation matches actual usage
6. **Test isolation** - Whether tests properly stub environment variables without global state leakage
7. **Configuration discovery** - Whether there are opportunities to make configuration more discoverable (e.g., validation errors that mention valid values)

## Related Context

Existing related ideas:
- `.dust/ideas/configuration-builder-pattern.md` - Proposes unifying configuration loading
- `.dust/ideas/refactor-test-env-stubbing-to-avoid-global-state.md` - Addresses test environment stubbing issues

Current centralized system:
- `lib/env-config.ts` defines typed interfaces for all environment variables
- `readEnvConfig(env)` function reads environment once at startup
- Seven categories: logging, bucket, session, runtime, agentDetection, auth, testing

Known inconsistencies from codebase review:
- Some files still use `process.env.X` directly (e.g., `lib/proxy/claude-api-proxy.ts`, `lib/codex/spawn-codex.ts`)
- Test stubbing uses module-level global state
- Some environment variables like `DUST_TRACE_ID`, `DUST_VERBOSE`, `DUST_USER_HOME` are used but not in `env-config.ts`

## Open Questions

### Should the audit create one idea per issue or group related issues?

#### Option: One idea per distinct issue

Create separate idea files for each type of problem found (e.g., "Centralize DUST_TRACE_ID in env-config", "Add validation for DUST_LOG_FORMAT", "Document DUST_USER_HOME"). This follows the "small units" principle and makes each issue independently actionable.

Pros: Clear scope per idea, easier to prioritize individually, parallel implementation
Cons: Could create many small ideas if issues are numerous

#### Option: Group by configuration subsystem

Create ideas organized by subsystem (e.g., "Logging configuration improvements", "Bucket configuration hardening"). This bundles related changes that would likely be implemented together.

Pros: Fewer idea files, related changes bundled, easier to see big picture
Cons: Larger scope per idea, harder to cherry-pick individual improvements

### How should the audit handle undocumented environment variables?

#### Option: Flag all undocumented variables as issues

Any environment variable used in the codebase but not in `env-config.ts` should trigger an idea to add it. This ensures comprehensive documentation.

Pros: Complete coverage, enforces the centralized pattern
Cons: May surface intentional one-off variables or deprecated variables still in code

#### Option: Only flag production-critical variables

Focus on environment variables that affect production behavior, ignoring test-only or development-only variables.

Pros: Reduces noise, focuses on high-impact issues
Cons: Subjective judgment, may miss issues in test/dev configuration

### Should the audit check for unused environment variables?

#### Option: Detect environment variables defined but never used

Search for variables in `env-config.ts` that aren't referenced elsewhere in the codebase. These may be stale documentation.

Pros: Keeps documentation clean, identifies dead configuration
Cons: Requires comprehensive code search, may have false positives (variables used only at runtime or in containers)

#### Option: Skip unused variable detection

Focus only on active usage issues, not dead code detection.

Pros: Simpler, avoids false positives
Cons: Allows configuration documentation to drift and accumulate cruft

### How should sensitive values be identified?

#### Option: Use a naming convention heuristic

Identify environment variables containing keywords like TOKEN, SECRET, KEY, PASSWORD, OAUTH as potentially sensitive.

Pros: Simple pattern matching, catches most cases
Cons: May have false positives/negatives, doesn't understand semantic context

#### Option: Maintain an explicit sensitive variables list

Keep a list of known sensitive environment variables (perhaps in `env-config.ts` metadata).

Pros: Precise control, self-documenting
Cons: Requires maintenance, could miss new sensitive variables
