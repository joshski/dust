# Warn on Unsafe Shell Patterns in Check Commands

Detect and warn when check commands in `settings.json` contain shell patterns that silently fail under `/bin/sh`, such as unquoted globstar `**` or brace expansion `{a,b}`.

## Goals

- [Actionable Errors](../goals/actionable-errors.md)
- [Make Changes with Confidence](../goals/make-changes-with-confidence.md)
- [Fast Feedback](../goals/fast-feedback.md)

## Blocked By

(none)

## Definition of Done

- [ ] `dust check` warns when a check command contains unquoted `**` or `{a,b}` patterns
- [ ] Warning message explains the problem and suggests a fix (e.g., quote the glob or use a config file)
- [ ] Warning does not block execution — the check still runs, but the user is informed
- [ ] Unit tests cover detection of `**` and brace expansion patterns
- [ ] The idea file `.dust/ideas/shell-expansion-in-check-commands.md` is deleted in the implementing commit
