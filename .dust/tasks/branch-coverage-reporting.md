# Branch coverage reporting

## Goals

- [Make changes with confidence](../goals/make-changes-with-confidence.md)
- [Fast feedback](../goals/fast-feedback.md)

## Blocked by

(none)

## Description

`bun test --coverage` only displays function and line coverage in its table output:

```
File                 | % Funcs | % Lines | Uncovered Line #s
```

Branch coverage (e.g., both sides of `code ?? 1`) is likely being measured but not reported.

Use the lcov formatter to get full coverage data including branches:

```bash
bun test --coverage --coverage-reporter=lcov
```

This outputs lcov format which includes branch coverage data (BRDA/BRF/BRH lines). AI agents can parse this format to identify uncovered branches.

## Definition of done

- Determine where bun outputs lcov data (file or directory)
- Add coverage output directory to `.gitignore`
- Document how to run coverage with lcov output (in README or as a script)
- Verify lcov output includes branch coverage data
