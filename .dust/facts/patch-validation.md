# Patch Validation

The `@joshski/dust/validation` export provides an API for validating proposed artifact changes against existing `.dust/` content before applying them.

## API

```typescript
import { validatePatch } from '@joshski/dust/validation'

const result = await validatePatch(fileSystem, dustPath, {
  files: {
    'facts/my-fact.md': '# My Fact\n\nContent here.', // add or update
    'facts/old-fact.md': null,                         // delete
  },
})
// result: { valid: boolean, violations: Violation[] }
```

## How It Works

The `validatePatch` function creates an overlay filesystem that merges patch files on top of the existing filesystem. This allows link validation to resolve references to both existing and new files. It runs the same validators as `dust lint` but only on the files in the patch.

Cross-file validators (principle bidirectional links, cycle detection) run across all principles — both existing and patched.

## Key Types

- `ArtifactPatch` — `{ files: Record<string, string | null> }` where keys are paths relative to the dust directory; `null` values signal deletion
- `ValidationResult` — `{ valid: boolean, violations: Violation[] }`
- `Violation` — `{ file: string, message: string, line?: number }`
