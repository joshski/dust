# Readable Test Data

Test data setup should use natural structures that mirror what they represent.

## Why it matters

When test data is easy to read, tests become self-documenting. A file system hierarchy expressed as a nested object immediately conveys structure, while a flat Map with path strings requires mental parsing to understand the relationships.

## In practice

Prefer literal structures that visually match the domain:

```javascript
// Avoid: flat paths that obscure hierarchy
const fs = createFileSystemEmulator({
  files: new Map([['/project/.dust/goals/my-goal.md', '# My Goal']]),
  existingPaths: new Set(['/project/.dust/ideas']),
})

// Prefer: nested object that mirrors file system structure
const fs = createFileSystemEmulator({
  project: {
    '.dust': {
      goals: {
        'my-goal.md': '# My Goal'
      },
      ideas: {}
    }
  }
})
```

The nested form:
- Shows parent-child relationships through indentation
- Makes empty directories explicit with empty objects
- Requires no mental path concatenation to understand structure

## How to evaluate

Work supports this goal when test setup data uses structures that visually resemble what they represent, reducing cognitive load for readers.

## Parent Goal

- [Make Changes with Confidence](make-changes-with-confidence.md)

## Sub-Goals

- (none)
