# Vitest Testing

Tests are run using [Vitest](https://vitest.dev) rather than Bun's built-in test runner. While Bun's test runner is faster and would align with the [Bun Runtime](./bun-runtime.md) choice, it lacks branch coverage metrics in its coverage reporting (see [bun#7100](https://github.com/oven-sh/bun/issues/7100)).

Branch coverage is important for ensuring thorough test coverage, so Vitest is used until Bun adds this capability.

## Istanbul Coverage

Coverage uses the istanbul provider (`@vitest/coverage-istanbul`). Istanbul ignore comments use the `@preserve` annotation so esbuild retains them during TypeScript transpilation:

```
/* istanbul ignore next @preserve -- reason */
```

For default parameter branches, place the comment before the function declaration (not inside the parameter list), since esbuild strips comments from parameter positions.

Files with native wrapper functions that can't be unit tested are excluded at the file level in `vitest.config.ts`:
- `lib/bucket/native-io.ts` (native WebSocket, stdin, signals, resize, stdout wrappers)
