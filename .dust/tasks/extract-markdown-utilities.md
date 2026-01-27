# Extract shared markdown utilities

The `extractTitle()` function is duplicated verbatim in `list.ts` and `next.ts`. The markdown link regex pattern is also duplicated within `validate.ts`.

Extract these into a shared `lib/cli/markdown-utilities.ts` file.

## Goals

- [Decoupled Code](../goals/decoupled-code.md)

## Blocked by

(none)

## Definition of done

- [ ] Create `lib/cli/markdown-utilities.ts`
- [ ] Export `extractTitle(content: string): string | null` function
- [ ] Export `MARKDOWN_LINK_PATTERN` constant for the link regex
- [ ] Update `list.ts` and `next.ts` to import `extractTitle`
- [ ] Update `validate.ts` to import and use `MARKDOWN_LINK_PATTERN`
- [ ] All tests pass
