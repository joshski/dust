# Branch coverage reporting

## Problem

`bun test --coverage` only displays function and line coverage in its table output:

```
File                 | % Funcs | % Lines | Uncovered Line #s
```

Branch coverage (e.g., both sides of `code ?? 1`) is likely being measured but not reported.

## Solution

Use the lcov formatter to get full coverage data including branches:

```bash
bun test --coverage --coverage-reporter=lcov
```

This outputs lcov format which includes branch coverage data (BRDA/BRF/BRH lines). AI agents can parse this format to identify uncovered branches.

## Considerations

- Bun may output lcov to a file or directory (e.g., `coverage/lcov.info`)
- Add the coverage output directory to `.gitignore`
- Could add a script or hook to make this easier to run
