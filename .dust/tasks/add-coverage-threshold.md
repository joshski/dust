# Add Coverage Threshold

Enforce a minimum code coverage threshold in the repository's check hook.

## Goals

- [Make Changes with Confidence](../goals/make-changes-with-confidence.md)
- [Fast Feedback](../goals/fast-feedback.md)

## Blocked by

(none)

## Definition of done

- Coverage threshold is configured (target: 100% or as close as practical)
- `.dust/hooks/check` fails if coverage falls below the threshold
- Clear error message indicates current vs required coverage when threshold is not met
