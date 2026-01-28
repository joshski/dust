# Check failure hints

Add configurable, context-specific hints to check configurations that display when checks fail, helping agents recover quickly without manual intervention.

When a check fails, agents often lack the context to understand why or what to do next. They may continue working on top of a broken foundation, miss simple fixes like running `npm install`, or waste time investigating issues that have known solutions.

## Implementation

1. Add an optional `hints` property (string array) to the `CheckConfig` interface in `lib/cli/types.ts`
2. Modify `displayResults` in `lib/cli/commands/check.ts` to display hints after each failed check's output
3. Update `.dust/config/settings.json` in this repository to add appropriate hints for each configured check
4. Add a hints example to the README.md documentation

Example output when checks fail:

```
✓ validate
✗ build

> npm run build
error TS2307: Cannot find module 'lodash'...

Hints for fixing 'build':
  - Run `npm install` if this is a fresh checkout
  - Check for TypeScript errors in the files you modified

1/2 checks passed
```

## Goals

- [Fast Feedback](../goals/fast-feedback.md)
- [Make Changes with Confidence](../goals/make-changes-with-confidence.md)

## Blocked by

(none)

## Definition of done

- [ ] `CheckConfig` interface includes optional `hints: string[]` property
- [ ] `displayResults` shows hints after each failed check's output (only if hints are configured)
- [ ] Hints are displayed with format: "Hints for fixing '<name>':" followed by bulleted list
- [ ] `.dust/config/settings.json` in this repository includes hints for configured checks
- [ ] README.md includes an example showing hints configuration
- [ ] All tests pass
