# Integrate FTA

Integrate FTA (Fast TypeScript Analyzer) into dust workflows to measure code complexity. **Status: Declined** - oxlint already provides equivalent functionality.

See [FTA documentation](https://ftaproject.dev/docs/getting-started) for details.

## Research Findings

### What FTA Measures

FTA produces a composite "FTA Score" based on:
- Cyclomatic complexity
- Halstead metrics (operators, operands, volume, difficulty, effort, predicted bugs)
- Line count

### Comparison with oxlint

oxlint already has a `complexity` rule (ESLint-compatible) that measures cyclomatic complexity at the **function level**. Currently not enabled in dust but available.

| Aspect | oxlint | FTA |
|--------|--------|-----|
| Cyclomatic complexity | ✓ (function-level) | ✓ (file-level) |
| Halstead metrics | ✗ | ✓ |
| Actionability | High (specific functions) | Low (entire files) |
| Threshold enforcement | ✓ (configurable) | ✓ (configurable) |
| Already integrated | ✓ | ✗ |

### Current Analysis (Updated)

Running `npx fta-cli lib` on 117 files:
- 37 files flagged as "Needs improvement" (60+)
- Top offenders are mostly large test files (2255+ lines)
- Score correlates strongly with file size

Running `bunx oxlint -W complexity .`:
- 12 functions flagged with cyclomatic complexity > 20
- Identifies specific functions to refactor
- More actionable than file-level scores

### Recommendation: Decline

1. **Redundant complexity checking** - oxlint's `complexity` rule already provides cyclomatic complexity analysis at function-level granularity
2. **File-level scoring less actionable** - FTA scores entire files, making it harder to identify what specifically needs refactoring
3. **Score heavily weighted by size** - FTA's worst scores are large test files, not necessarily poorly structured code
4. **Minimal unique value** - Halstead metrics (volume, difficulty, predicted bugs) are not commonly used in practice and don't provide clear refactoring guidance
5. **Additional dependency** - Adds maintenance burden for marginal benefit

### Alternative

Enable oxlint's `complexity` rule in `.oxlintrc.json` to catch function-level complexity issues:
```json
{
  "rules": {
    "complexity": "warn"
  }
}
```

This provides actionable feedback (specific functions to simplify) without adding a new tool.

## Related

- Supports principle: [Decoupled Code](../principles/decoupled-code.md)
