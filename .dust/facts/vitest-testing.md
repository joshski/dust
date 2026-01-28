# Vitest Testing

Tests are run using [Vitest](https://vitest.dev) rather than Bun's built-in test runner. While Bun's test runner is faster and would align with the [Bun Runtime](./bun-runtime.md) choice, it lacks branch coverage metrics in its coverage reporting (see [bun#7100](https://github.com/oven-sh/bun/issues/7100)).

Branch coverage is important for ensuring thorough test coverage, so Vitest is used until Bun adds this capability.
