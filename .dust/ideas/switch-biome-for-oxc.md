# Switch Biome for OXC

Evaluate replacing Biome with OXC tooling (`oxlint` + `oxfmt`) for this repository's lint and format checks.

## Why This Is Interesting

- [Minimal Dependencies](../principles/minimal-dependencies.md): easier tool swapping is a stated principle.
- [Fast Feedback Loops](../principles/fast-feedback-loops.md): OXC appears substantially faster in this repository.
- [Lint Everything](../principles/lint-everything.md): parity matters; we should avoid losing important checks.

## Current State

- `.dust/config/settings.json` runs `bunx biome check .` as `lint (biome)` in `dust check`.
- `biome.json` includes custom GritQL plugins:
  - `./biome/dust-no-abbreviated-names.grit`
  - `./biome/no-vitest-mocking.grit`
  - plus `./biome/no-unsafe-double-cast.grit` for `*.test.ts` override
- `package.json` exports `./biome` and includes `biome/` in published files.
- `.dust/facts/biome-custom-rules.md` documents these Biome-specific custom rules.

## Research Notes

### Lint Parity

Command set (scoped to code + root config files):

- `bunx biome check -- lib scripts evals system-tests package.json knip.json tsconfig.json tsconfig.build.json vitest.config.ts biome.json`
- `bunx oxlint -- lib scripts evals system-tests package.json knip.json tsconfig.json tsconfig.build.json vitest.config.ts biome.json`

Observed results:

- Biome: `2 warnings` on `lib/process/spawn-contract.ts` (`noExplicitAny`).
- Oxlint (default): `12 warnings`, different rule profile (e.g. `no-control-regex`, `require-yield`, unicorn rules).
- Oxlint does not provide direct compatibility for Biome GritQL plugin rules; current custom rules would be lost unless replaced by another mechanism.

### Format Parity

Commands:

- `bunx oxfmt --check -- lib scripts evals system-tests package.json knip.json tsconfig.json tsconfig.build.json vitest.config.ts biome.json`
- `bunx oxfmt --migrate=biome` (in temp dir), then:
  - `bunx oxfmt --check --config <migrated-config> -- lib scripts evals system-tests package.json knip.json tsconfig.json tsconfig.build.json vitest.config.ts biome.json`

Observed results:

- Oxfmt default profile: format differences in `197/202` files on the scoped set.
- Oxfmt with migrated Biome config: only `package.json` still differs.
- `package.json` delta appears to be key reordering (not syntax/style breakage), but this is still formatting drift relative to current repository output.

### Performance Metrics

Three-run timings on the scoped command set above (`/usr/bin/time -p`, wall clock):

- Biome check: `1.76s`, `1.75s`, `1.75s` (avg `1.75s`)
- Oxlint: `0.18s`, `0.19s`, `0.18s` (avg `0.18s`)
- Oxfmt --check: `0.35s`, `0.36s`, `0.36s` (avg `0.36s`)

Takeaway: OXC is materially faster in this repository. Lint/format parity is not drop-in with defaults.

## Proposal

Run a staged migration spike before replacing the default check:

1. Add temporary opt-in checks for `oxlint` and `oxfmt --check` (without removing Biome yet).
2. Define parity policy explicitly:
   - required: preserve current custom lint intent
   - optional: accept intentional rule/profile changes with documented rationale
3. If parity policy is met, switch `lint (biome)` in `.dust/config/settings.json` to OXC commands.
4. Add/update facts for any new lint/format architecture.

## Open Questions

### How should we preserve Biome custom GritQL rules if we switch lint engines?

#### Option 1: Keep Biome only for custom rules (recommended)

Run `oxlint` for broad linting speed, and keep a minimal Biome pass that enforces only the existing GritQL rules.

#### Option 2: Port custom rule intent to another system and fully remove Biome

Re-implement `dust-no-abbreviated-names`, `no-vitest-mocking`, and `no-unsafe-double-cast` via an alternative lint mechanism.

#### Option 3: Drop the custom rules

Accept weaker policy enforcement for simpler tooling.

### What level of lint rule parity is required?

#### Option 1: Baseline parity with current Biome outcomes (recommended)

Require OXC-based pipeline to match current pass/fail semantics (or documented equivalent) before switching defaults.

#### Option 2: Embrace OXC defaults immediately

Accept changed diagnostics as part of migration, and fix new warnings over time.

### How should formatting parity be defined for `package.json` key ordering differences?

#### Option 1: Preserve current Biome output exactly (recommended)

Treat any ordering drift as non-parity and keep Biome formatting for affected files.

#### Option 2: Accept deterministic ordering differences

Allow Oxfmt ordering if stable and documented, even when output differs from Biome.

### Should `.dust/` markdown formatting be in scope for this migration?

#### Option 1: No, keep scope to code/config formatting only (recommended)

Migrate lint/format for code files first; keep markdown unchanged to limit risk.

#### Option 2: Yes, include markdown formatting in the migration

Use Oxfmt across `.dust/` too and accept broad artifact reformatting.
