# Bun Runtime

Dust's internal development scripts use [Bun](https://bun.sh) as the JavaScript/TypeScript runtime. Bun provides fast startup times and native TypeScript execution without a separate compilation step, supporting the [Fast Feedback](../principles/fast-feedback.md) principle.

The library code in [`lib/`](../../lib) uses only Node.js-compatible APIs, making it portable across JavaScript runtimes. However, the CLI entry point ([`bin/dust`](../../bin/dust)) currently requires Bun to run due to its shebang (`#!/usr/bin/env bun`). The build step compiles the CLI to Node.js-compatible JavaScript (`dist/dust.js`), enabling it to run without Bun installed.

This is purely for developing Dust itself. Downstream users install the published npm package (`@joshski/dust`) which includes the compiled `dist/dust.js` and does not require Bun.
