# Bun Runtime

Dust's internal development scripts use [Bun](https://bun.sh) as the JavaScript/TypeScript runtime. Bun provides fast startup times and native TypeScript execution without a separate compilation step, supporting the [Fast Feedback](../goals/fast-feedback.md) goal.

The library code in `lib/` uses only Node.js-compatible APIs, making it portable across JavaScript runtimes. However, the CLI entry point (`bin/dust`) currently requires Bun to run due to its shebang (`#!/usr/bin/env bun`). A future [build step](../tasks/add-cli-build-step.md) will compile the CLI to Node.js-compatible JavaScript, enabling it to run without Bun installed.

Internal development scripts in `scripts/` may use Bun-specific APIs for convenience.

This is purely for developing Dust itself. Downstream users of Dust are not required to use Bun once a packaged distribution is available. Currently there is no packaged distribution for downstream users.
