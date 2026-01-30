# Improve list and next command output format

The `dust list` and `dust next` commands currently output items in a compact single-line format that is difficult to scan. The output should be reformatted to be more readable with distinct visual sections.

## Current format

```
ideas:
  .dust/ideas/catch-mistakes-in-commit-history.md - The workflow depends on discipline to prevent duplication of effort.
  .dust/ideas/claim-server.md - A "claim server" which can be self-hosted or a managed service.
```

## Target format

```
Ideas

# Catch mistakes in commit history
The workflow depends on discipline to prevent duplication of effort.
 .dust/ideas/catch-mistakes-in-commit-history.md

# Claim server
A "claim server" which can be self-hosted or a managed service.
 .dust/ideas/claim-server.md
```

## Implementation details

Changes needed in `lib/cli/commands/list.ts` and `lib/cli/commands/next.ts`:

1. Add terminal color support using ANSI escape codes or a library like `picocolors` (already in dependencies)
2. Use emoji prefixes for section headers (e.g., "Ideas", "Tasks", "Goals", "Facts")
3. Extract and display the H1 title from each markdown file
4. Display the opening sentence on its own line
5. Show the file path on a separate line with an arrow prefix
6. Apply different colors: bright for title, dim for description, cyan for file path

The `extractTitle` function already exists in `lib/cli/markdown-utilities.ts` and can be used to get the H1 heading.

## Goals

- [Context window efficiency](../goals/context-window-efficiency.md)
- [Progressive disclosure](../goals/progressive-disclosure.md)

## Blocked by

(none)

## Definition of done

- [ ] `dust list` shows items in the new multi-line format with colors
- [ ] `dust next` shows items in the new multi-line format with colors
- [ ] Section headers include appropriate emoji prefixes
- [ ] Titles are extracted from H1 headings and displayed prominently
- [ ] File paths shown with arrow prefix on separate line
- [ ] Existing tests updated to match new output format
- [ ] All tests pass
