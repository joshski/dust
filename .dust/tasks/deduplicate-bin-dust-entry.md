# Deduplicate bin/dust and lib/cli/entry.ts

## Goals

- Reduce code duplication
- Single source of truth for CLI initialization

## Blocked by

(none)

## Description

The `bin/dust` file and `lib/cli/entry.ts` contain nearly identical code for setting up the filesystem and glob adapters and calling `main()`.

`bin/dust` should import `lib/cli/entry.ts` instead of duplicating the initialization logic:

```typescript
#!/usr/bin/env bun

import "../lib/cli/entry";
```

## Definition of done

- [ ] `bin/dust` imports `lib/cli/entry.ts` instead of duplicating the code
- [ ] CLI still works correctly when run via `./bin/dust`
- [ ] Bundled builds still work correctly
