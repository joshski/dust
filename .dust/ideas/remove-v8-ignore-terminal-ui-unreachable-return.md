# Remove v8 Ignore: Terminal UI Unreachable Return

Remove the v8 coverage exclusion for the unreachable return in [`lib/bucket/terminal-ui.ts`](../../lib/bucket/terminal-ui.ts).

## Current State

Lines 131-134 in `truncateWithAnsi()` function:

```typescript
/* v8 ignore start - unreachable: textLength > maxWidth guarantees visibleCount
   reaches truncateAt before exhausting all characters. Required for TypeScript. */
return result + ANSI.RESET
/* v8 ignore stop */
```

The function truncates text with ANSI codes. The loop processes characters until `visibleCount >= truncateAt`, then returns early. This final return is unreachable because:

1. The function has a guard: `if (textLength <= maxWidth) return text`
2. When `textLength > maxWidth`, the loop must reach `truncateAt` before exhausting characters
3. TypeScript doesn't understand this invariant

## Why This Matters

The exclusion documents why the return exists but leaves dead code in the function. This is a code smell that could be eliminated with restructuring.

## Restructuring Approach

**Option A: Use assertion**

```typescript
// Instead of unreachable return
throw new Error('Invariant violated: truncation point not reached')
```

This makes the impossibility explicit. If the invariant ever breaks, it fails loudly.

**Option B: Restructure with early return pattern**

Rewrite the loop to avoid needing a final return:

```typescript
function truncateWithAnsi(text: string, maxWidth: number): string {
  // ... guard and setup ...

  while (true) {
    // Process ANSI codes
    // Count visible characters
    if (visibleCount >= truncateAt) {
      return result + CHARS.ellipsis + ANSI.RESET
    }
    // This loop always terminates via the return above
  }
}
```

TypeScript understands `while (true)` with internal returns doesn't need a final return.

**Option C: Add explicit never assertion**

```typescript
return assertNever('Truncation invariant violated')
```

Where `assertNever` returns `never` and throws.

## Benefits

- Removes dead code
- Makes invariant explicit
- Eliminates coverage exclusion

## Open Questions

### How should provably unreachable code be handled?

#### Option: Assert with error

Throws if reached. Documents the invariant. May catch future bugs.

#### Option: Use `while(true)` pattern

Restructure so TypeScript knows the return is unreachable. No runtime assertion needed.

#### Option: Keep exclusion with documentation

The current comment explains why. Accept that TypeScript analysis has limits.
