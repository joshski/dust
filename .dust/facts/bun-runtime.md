# Bun Runtime

Dust's internal development scripts use [Bun](https://bun.sh) as the JavaScript/TypeScript runtime. Bun provides fast startup times and native TypeScript execution without a separate compilation step, supporting the [Fast Feedback](../goals/fast-feedback.md) goal.

This is purely for developing Dust itself. Downstream users of Dust are not required to use Bun. Currently there is no packaged distribution for downstream users.
