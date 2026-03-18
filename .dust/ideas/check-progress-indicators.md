# Check Progress Indicators

Show progress during long-running checks so agents know work is happening.

## Background

The [Slow Feedback Coping](../principles/slow-feedback-coping.md) principle acknowledges that "some feedback is unavoidably slow" and dust should offer "coping strategies rather than pretending it can be eliminated."

Currently, when `dust check` runs long-running checks (tests, builds, lint passes), agents see no output until the check completes. A check that takes 30 seconds appears identical to one that is hung. Agents may:
- Wait unnecessarily for stuck processes
- Kill healthy long-running checks prematurely
- Not know if a check is making progress

## The Gap

Check output is currently buffered until completion:

```
$ dust check
⏳ Running checks...
[30 seconds of silence]
✅ All checks passed
```

Agents have no signal that work is happening during those 30 seconds.

## Proposed Solution

Stream progress indicators during check execution:

```
$ dust check
⏳ Running checks...
  lint .......... (running 5s)
  test .......... (running 12s)
  lint ✅ passed (8s)
  test .......... (running 15s)
  build ......... (running 3s)
  test ✅ passed (18s)
  build ✅ passed (6s)
✅ All checks passed
```

Key features:
- Show elapsed time per check
- Update in-place or append progress lines
- Indicate which checks are still running
- Graceful fallback when output isn't a TTY

## Benefits

- **Visibility**: Agents see that work is happening
- **Debugging**: Identify which checks are slow or stuck
- **Confidence**: Clear distinction between "working" and "hung"
- **Interruptibility**: Agents can decide to cancel specific slow checks

## Principle Alignment

- [Slow Feedback Coping](../principles/slow-feedback-coping.md) - Progress signals during unavoidable waits
- [Fast Feedback Loops](../principles/fast-feedback-loops.md) - Earlier partial feedback
- [Actionable Errors](../principles/actionable-errors.md) - "Check X is slow" is more actionable than silence

## Open Questions

### What output format works for both humans and agents?

#### TTY-aware formatting

Use ANSI cursor control for in-place updates when output is a terminal, fall back to line-by-line for pipes/files.

#### Always line-by-line

Simpler implementation. Each progress update is a new line. More verbose but universally parseable.

### How often should progress update?

#### Fixed interval

Update every N seconds (e.g., every 5s). Predictable but may be noisy for fast checks.

#### Adaptive

Update more frequently early (show that check started), less frequently as time passes. More complex but better UX.

### Should progress show check output incrementally?

#### No, just timing

Only show elapsed time and running/complete status. Keeps output clean.

#### Yes, show stdout snippets

Include recent output lines from each check. More informative but potentially noisy.
