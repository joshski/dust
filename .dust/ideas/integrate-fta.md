# Integrate FTA

Integrate FTA (Fast TypeScript Analyzer) into dust workflows to measure code complexity.

See [FTA documentation](https://ftaproject.dev/docs/getting-started) for details.

## Current Analysis

Running `bunx fta-cli lib` or `npx fta-cli lib` produces identical results. Current status (51 files):

| Assessment | Count | Notes |
|------------|-------|-------|
| Needs improvement (60+) | 2 | Both test files |
| Could be better (50-60) | 12 | Mix of tests and implementation |
| OK (<50) | 37 | Most files |

Top offenders:
- `cli/commands/loop.test.ts` - 67.21
- `cli/wire.test.ts` - 63.11
- `claude/vcr.test.ts` - 58.68
- `cli/commands/lint-markdown.ts` - 58.47

## Potential Integration Points

- Add `bin/dust check fta` or similar command
- Include in pre-push hooks to catch complexity regressions
- Set thresholds that fail builds when exceeded

## Related

- Supports goal: [Decoupled Code](../goals/decoupled-code.md)
