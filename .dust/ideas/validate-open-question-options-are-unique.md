# Validate open question options are unique

Within any Open Questions section of a dust idea, the `#### Option` headings (option names) under each `### Question?` heading must be unique strings.

## Context

The `validateIdeaOpenQuestions` function in `lib/lint/validators/idea-validator.ts` iterates through idea file lines, tracking h3 question headings and h4 option headings. It currently enforces:

- Questions must end with `?`
- Questions must have at least one option
- No top-level content outside the heading structure
- `## Open Questions` must be the last section

It does **not** check whether two options under the same question have identical names. Duplicate option headings make the question ambiguous and are almost certainly a copy-paste error. Adding this rule closes the gap.

## Implementation Notes

The fix fits naturally into the existing line-by-line loop. When the parser encounters a `#### ` heading inside a question, it should record the option name and compare it against previously seen names for the current question. On entering a new `### ` question, the seen-options set resets.

The `currentQuestionLine` state variable already tracks whether an option belongs to a question; a parallel `Set<string>` tracking option names per question would be sufficient.

## Open Questions

### Should the uniqueness check be case-sensitive?

#### Case-sensitive

`Yes` and `yes` are treated as different options, matching the current heading comparison behaviour elsewhere in the validator. Simple to implement and consistent with how markdown headings work.

#### Case-insensitive

`Yes` and `yes` are treated as duplicates, since an author who writes both almost certainly intended only one. More useful in practice, because the most likely source of confusion is options that differ only in capitalisation.
