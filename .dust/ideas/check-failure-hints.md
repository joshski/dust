# Check Failure Hints

Provide configurable, context-specific hints when `dust check` failures occur, helping agents recover quickly without manual intervention.

## Problem

When checks fail, agents often lack the context to understand why or what to do next. They may:
- Continue working on top of a broken foundation
- Miss simple fixes like running `npm install`
- Not realize they should abort and fix the issue first
- Waste time investigating issues that have known solutions

## Design

Add a `hints` property to each check configuration that displays when that check fails:

```json
{
  "checks": [
    {
      "name": "build",
      "command": "npm run build",
      "hints": [
        "Run `npm install` if this is a fresh checkout",
        "Check for TypeScript errors in the files you modified"
      ]
    },
    {
      "name": "test",
      "command": "npm test",
      "hints": [
        "Run failing tests in isolation: `npm test -- --grep 'test name'`",
        "Check if you need to update snapshots: `npm test -- -u`"
      ]
    },
    {
      "name": "lint",
      "command": "npm run lint",
      "hints": [
        "Many lint errors can be auto-fixed: `npm run lint -- --fix`"
      ]
    }
  ]
}
```

Hints are empty by default.

## Behavior

When a check fails, display its hints after the error output:

```
✓ validate
✗ build
✗ test

> npm run build
error TS2307: Cannot find module 'lodash'...

Hint for fixing 'build':
  - Run `npm install` if this is a fresh checkout
  - Check for TypeScript errors in the files you modified

> npm test
FAIL src/foo.test.ts
...

Hint for fixing 'test':
  - Run failing tests in isolation: `npm test -- --grep 'test name'`
  - Check if you need to update snapshots: `npm test -- -u`

1/3 checks passed
```

## Implementation

- Update `.dust/config/settings.json` in this repository to add appropriate hints for each configured check
- Include an example in the README.md file

## Benefits

- Project-specific guidance without modifying dust code
- Reduces agent confusion and wasted iterations
- Makes check output actionable, not just informational
