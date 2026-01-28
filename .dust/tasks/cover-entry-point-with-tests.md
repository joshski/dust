# Cover entry point with tests

The Node.js entry point (`lib/cli/entry.ts`) wires together real-world dependencies (Node.js fs, process, console) and is currently excluded from test coverage. This task restructures it so everything can be tested.

## Current structure

The entry point:
1. Creates a `FileSystem` object using `node:fs` functions
2. Creates a `GlobScanner` object using `readdir`
3. Calls `main()` with these dependencies and process context
4. Calls `process.exit()` with the result's exit code

## Approach

Extract the wiring logic into a testable function that accepts the real-world primitives as parameters, leaving only the minimal untestable shell that passes in the actual Node.js APIs.

## Goals

- [Make Changes with Confidence](../goals/make-changes-with-confidence.md)
- [Decoupled Code](../goals/decoupled-code.md)

## Blocked by

(none)

## Definition of done

- [ ] Entry point logic is restructured into a testable function
- [ ] Tests cover the wiring logic (FileSystem creation, GlobScanner creation, exit code handling)
- [ ] Only the minimal shell calling the real Node.js APIs remains untestable
- [ ] Coverage exclusion for entry.ts is removed or narrowed to just the shell
