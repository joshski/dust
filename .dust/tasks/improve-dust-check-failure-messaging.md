# Improve dust check failure messaging

When `dust check` fails, provide specific instructions to help agents recover. The messaging should:

1. Remind agents to install dependencies first (e.g., `npm install`)
2. Clearly state that agents should ABORT their work if they cannot make `dust check` pass
3. Provide actionable next steps based on which check failed

This is important because AI agents may not realize they need to stop and fix issues before continuing. Clear failure messaging prevents agents from continuing work on top of a broken foundation.

## Goals

- [Fast Feedback](../goals/fast-feedback.md)
- [Make Changes with Confidence](../goals/make-changes-with-confidence.md)

## Blocked by

(none)

## Definition of done

- [ ] When `dust check` fails, output includes a reminder about installing dependencies
- [ ] When `dust check` fails, output includes a clear instruction to ABORT work until checks pass
- [ ] Failure messages are specific to which check failed (validate, lint, build, tests, typecheck)
- [ ] All tests pass
