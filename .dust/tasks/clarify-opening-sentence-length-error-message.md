# Clarify opening sentence length error message

When the opening sentence validation fails, agents often respond by leaving only one short sentence in the intro. The error message should clarify that multiple sentences are allowed - only the first sentence (up to the first full stop) must be short.

## Current behavior

In `lib/cli/commands/lint-markdown.ts:113`, the error message is:
```
Opening sentence is X characters (max 150)
```

## Desired behavior

Update the error message to something like:
```
Opening sentence is X characters (max 150). Split into multiple sentences; only the first sentence is checked.
```

## Goals

(none)

## Blocked by

(none)

## Definition of done

- [ ] The error message in `validateOpeningSentenceLength` clarifies that the paragraph can have multiple sentences
- [ ] All checks pass (`bin/dust check`)
