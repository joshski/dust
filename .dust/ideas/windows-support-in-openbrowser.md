# Windows support in openBrowser

The `openBrowser` function in [`lib/bucket/auth-server.ts`](../../lib/bucket/auth-server.ts) doesn't support Windows.

## Current State

The function uses platform detection but only handles two cases:

```typescript
const cmd = process.platform === 'darwin' ? 'open' : 'xdg-open'
```

This works for macOS (`open`) and Linux (`xdg-open`), but Windows needs `start` or similar.

## Gap

The [Cross-Platform Compatibility](../principles/cross-platform-compatibility.md) principle states dust "should work consistently across operating systems: Linux, macOS, and Windows."

Windows users attempting OAuth authentication via `dust bucket` will encounter a failure when the browser doesn't open automatically.

## Proposed Fix

Update the platform detection to include Windows:

```typescript
function getOpenCommand(): string {
  switch (process.platform) {
    case 'darwin':
      return 'open'
    case 'win32':
      return 'start'
    default:
      return 'xdg-open'
  }
}
```

Note: On Windows, `start` requires special handling as it's a shell built-in, not a standalone executable. The spawn call may need `shell: true` or use `cmd /c start`.

## Open Questions

### How should the Windows case be tested?

#### Mock process.platform in tests

Create tests that mock `process.platform` to `'win32'` and verify the correct command is selected. This is straightforward but doesn't verify actual behavior on Windows.

#### Skip automated testing, rely on manual verification

The function is already marked with `v8 ignore` (excluded from coverage). Document the Windows support and rely on manual testing.

#### Add integration test with platform detection

Create an integration test that runs on Windows CI to verify browser opening works end-to-end. More thorough but requires Windows CI infrastructure.
