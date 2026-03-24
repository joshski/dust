# Disclose full istanbul coverage

The minimal istanbul reporter (lib/istanbul/minimal-reporter.cjs) intentionally hides coverage noise by showing only incomplete files and line ranges.

## Current State

The IncompleteCoverageReporter only shows files with < 100% coverage:
- File path and percentage metrics (lines, statements, branches, functions)
- Uncovered line ranges (e.g., "Lines 2-3")
- Branch coverage gaps (by line number)

When all files have 100% coverage, it outputs: "✔ 100% coverage!"

## Problem

Agents debugging coverage issues or working on "remove v8 ignore" tasks need access to the full istanbul coverage data:
- Detailed statement coverage (which specific statements are uncovered)
- Branch map (which branches are missing)
- Function coverage (which functions weren't called)
- Full file paths and line/column locations
- Coverage counts (how many times each statement/branch was hit)

This data exists in the istanbul coverage map but is intentionally hidden by the minimal reporter.

## Proposed Solution

Write an additional machine-readable coverage report to a file alongside the minimal console output.

### Report Format

Use JSON Lines (newline-delimited JSON) for unix-tool-friendliness:
- Each line is a valid JSON object representing one file's coverage
- Easy to grep, filter with jq, or process line-by-line
- No need to parse entire file structure

Example:
```jsonl
{"file":"lib/foo.ts","statements":{"pct":95.5,"covered":21,"total":22},"branches":{"pct":87.5,"covered":7,"total":8},"functions":{"pct":100,"covered":5,"total":5},"lines":{"pct":95.2,"covered":20,"total":21},"uncoveredLines":[42],"uncoveredBranches":[{"line":15,"type":"if"}]}
{"file":"lib/bar.ts","statements":{"pct":100,"covered":10,"total":10},"branches":{"pct":100,"covered":4,"total":4},"functions":{"pct":100,"covered":2,"total":2},"lines":{"pct":100,"covered":10,"total":10},"uncoveredLines":[],"uncoveredBranches":[]}
```

### File Location

Write to `coverage/coverage-detailed.jsonl` (alongside vitest's other outputs in the coverage directory).

### Console Output

When detailed coverage is written, append to the minimal output:
```
✔ 100% coverage!

Detailed coverage: coverage/coverage-detailed.jsonl
```

Or when incomplete:
```
2 files have < 100% coverage:

lib/foo.ts (95.5% lines, 87.5% branches)
- Line 42
- Line 15 (branch)

Detailed coverage: coverage/coverage-detailed.jsonl
```

## Implementation Context

The reporter is a CommonJS module (lib/istanbul/minimal-reporter.cjs) that:
1. Extends ReportBase from istanbul-lib-report
2. Has an execute(context) method
3. Calls context.getTree().visit() to traverse all files
4. Uses context.writer.writeFile(filename) to create output files

The json reporter (node_modules/istanbul-reports/lib/json/index.js) shows how to write JSON coverage data to files.

## Open Questions

### Should the detailed report include all files or only incomplete files?

#### Option: All files

Includes complete coverage information for every file in the coverage map.

**Pros:**
- Agents can grep for any file they're interested in
- Provides baseline for comparing coverage over time
- Shows coverage counts (not just gaps) which can identify hot paths

**Cons:**
- Larger file size (though still small compared to coverage map JSON)
- More noise when agents only care about gaps

#### Option: Only incomplete files

Only includes files with < 100% coverage (matches minimal reporter behavior).

**Pros:**
- Smaller file, focused on actionable data
- Consistent with minimal reporter's philosophy
- Agents working on coverage gaps don't need to filter

**Cons:**
- Can't see coverage counts for complete files
- Agents investigating specific files need to check coverage first

#### Option: Configurable via reporter options

Allow configuration through vitest.config.ts reporter options.

**Pros:**
- Flexibility for different use cases
- Can start with one default and change later

**Cons:**
- Adds complexity to reporter interface
- Not clear which default is better

### What level of detail should be included?

#### Option: Minimal (just summaries and gaps)

Include only percentage metrics, uncovered line numbers, and uncovered branch locations.

**Pros:**
- Small file size
- Covers most agent debugging needs
- Easy to grep for specific files or line numbers

**Cons:**
- Can't see coverage counts (how many times each line was hit)
- Can't map statements to specific source code locations

#### Option: Full coverage map data

Include the complete istanbul FileCoverage object for each file (statementMap, fnMap, branchMap, s, f, b counters).

**Pros:**
- Complete information for deep debugging
- Agents can reconstruct any coverage view they need
- Matches what json reporter writes

**Cons:**
- Much larger files
- Harder to grep meaningfully (deeply nested structures)
- Duplicates what coverage-final.json already contains

#### Option: Structured middle ground

Include summaries plus structured arrays of uncovered items:
```json
{
  "file": "lib/foo.ts",
  "statements": {"pct": 95.5, "covered": 21, "total": 22},
  "branches": {"pct": 87.5, "covered": 7, "total": 8},
  "functions": {"pct": 100, "covered": 5, "total": 5},
  "lines": {"pct": 95.2, "covered": 20, "total": 21},
  "uncoveredStatements": [{"line": 42, "column": 5}],
  "uncoveredBranches": [{"line": 15, "column": 8, "type": "if", "branch": 1}],
  "uncoveredFunctions": []
}
```

**Pros:**
- Grep-friendly structure
- Includes location details for debugging
- Much smaller than full coverage map
- Provides actionable information beyond line numbers

**Cons:**
- More complex than minimal approach
- Requires parsing to extract specific items

### Should this be a separate reporter or extend the existing one?

#### Option: Extend IncompleteCoverageReporter

Add detailed report writing to the existing minimal reporter class.

**Pros:**
- Single reporter configuration in vitest.config.ts
- Guaranteed that both outputs stay in sync
- Simpler mental model (one reporter, two outputs)

**Cons:**
- Couples two distinct output formats
- Harder to disable detailed output if unwanted

#### Option: Create DetailedCoverageReporter

New reporter class that writes only the detailed JSON Lines output.

**Pros:**
- Separation of concerns
- Can be enabled/disabled independently
- Could be used without minimal reporter if desired

**Cons:**
- Requires two reporter entries in vitest.config.ts
- Potential drift between reporters' behavior
- More code duplication

#### Option: Hybrid - extend ReportBase directly

Create a new reporter that writes both minimal console output and detailed file output.

**Pros:**
- Single source of truth for both formats
- Can share logic between outputs
- Clean separation from existing minimal reporter

**Cons:**
- Need to maintain two reporters or deprecate existing one
- Migration path unclear

### Should output location be configurable?

#### Option: Fixed location (coverage/coverage-detailed.jsonl)

Hardcode the output path relative to the coverage directory.

**Pros:**
- Simple implementation
- Predictable for agents (no config to read)
- Follows convention (coverage outputs go in coverage/)

**Cons:**
- Can't customize if needed
- Potential conflicts with other tools

#### Option: Configurable via reporter options

Allow passing output path through vitest.config.ts:
```typescript
reporter: [
  [resolve('lib/istanbul/minimal-reporter.cjs'), { detailedOutput: 'custom-path.jsonl' }]
]
```

**Pros:**
- Flexibility for different environments
- Could disable detailed output by passing null

**Cons:**
- Agents need to parse vitest config to find the file
- More complex implementation
- Unclear benefit over fixed location
