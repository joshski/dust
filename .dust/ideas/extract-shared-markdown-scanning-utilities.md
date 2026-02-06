# Extract shared markdown scanning utilities

Multiple commands repeat the same directory scanning and metadata extraction pattern.

- `lib/cli/commands/list.ts` scans directories and calls extractTitle/extractOpeningSentence
- `lib/cli/commands/next.ts` does the same for the tasks directory

A shared `lib/markdown/scanning.ts` utility would reduce this duplication.
