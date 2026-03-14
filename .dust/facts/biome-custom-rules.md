# Biome Custom Rules

Linting now uses `oxlint` defaults plus repository-owned custom policy checks.

The old Biome GritQL plugin intent is preserved in [`lib/lint/policy-checker.ts`](../../lib/lint/policy-checker.ts) and run by [`scripts/lint/policy-checks.ts`](../../scripts/lint/policy-checks.ts) as part of `dust check`.

## Rule Ownership

The repository-owned checker enforces these policies:
- `dust-no-abbreviated-names` - disallows abbreviated binding names like `ctx`, `opts`, and `err`.
- `no-vitest-mocking` - disallows `vi.mock`, `vi.spyOn`, timer mocking helpers, and `vi.fn`.
- `no-unsafe-double-cast` - disallows `as unknown as` in `*.test.ts`.

Design:
- Pure analysis core: `analyzePolicyViolations(filePath, content)` returns diagnostics for one file.
- Thin shell: [`scripts/lint/policy-checks.ts`](../../scripts/lint/policy-checks.ts) handles file discovery, IO, and CLI exit behavior.

## Related Commands

- `bunx oxlint -D suspicious .` - primary linter with OXC defaults plus suspicious category.
- `bun run scripts/lint/policy-checks.ts` - repository-owned lint policy enforcement.
