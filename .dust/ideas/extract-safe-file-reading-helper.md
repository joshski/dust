# Extract safe file reading helper

Replace four identical try/catch blocks in `lintMarkdown()` with a shared safe file reading helper.

`lint-markdown.ts` contains this exact pattern at lines 686-694, 710-718, 756-765, and 833-841:

```typescript
let content: string
try {
  content = await fileSystem.readFile(filePath)
} catch (error) {
  if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
    continue
  }
  throw error
}
```

Extract a helper like `safeReadFile(fileSystem, filePath): Promise<string | null>` that returns `null` on `ENOENT` and throws on other errors. Each call site replaces the try/catch with a simple null check and `continue`.
