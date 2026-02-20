# Vitest Testing

Tests are run using [Vitest](https://vitest.dev) rather than Bun's built-in test runner. While Bun's test runner is faster and would align with the [Bun Runtime](./bun-runtime.md) choice, it lacks branch coverage metrics in its coverage reporting (see [bun#7100](https://github.com/oven-sh/bun/issues/7100)).

Branch coverage is important for ensuring thorough test coverage, so Vitest is used until Bun adds this capability.

## v8 Coverage Limitations

The v8 coverage provider does not honor `/* v8 ignore */` comments for function-level metrics on anonymous functions inside async callbacks. Files using inline ignores work for line/statement coverage but require file-level exclusions in `vitest.config.ts` to achieve 100% function coverage. Currently affected files:
- `lib/bucket/repository-loop.ts`
- `lib/cli/commands/bucket.ts`

When v8 fixes this limitation upstream, these file-level exclusions can be removed.
