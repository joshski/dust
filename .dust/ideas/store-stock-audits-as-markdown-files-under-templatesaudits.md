# Store stock audits as markdown files under ./templates/audits

Move stock audits from hardcoded TypeScript arrays to markdown files, loading them similarly to how templates are loaded in commands.

## Current State

Stock audits are currently defined as a hardcoded `STOCK_AUDITS` array in `lib/cli/commands/audit.ts:26-135`. Each audit has a `name`, `description`, and `template` property with the full markdown content as a string literal.

Meanwhile, templates used by commands are stored as `.txt` files in `lib/templates/` and loaded via `loadTemplate()` from `lib/cli/templates.ts`.

## Proposed Change

Store stock audits as individual markdown files under `lib/templates/audits/`:
- `lib/templates/audits/security-review.md`
- `lib/templates/audits/test-coverage.md`
- `lib/templates/audits/dead-code.md`

Load these files at runtime using a similar pattern to `loadTemplate()`.

## Benefits

1. **Consistency** - Audits would follow the same pattern as other templates
2. **Editability** - Markdown files are easier to read and edit than string literals
3. **Syntax highlighting** - Editors provide proper markdown highlighting for `.md` files
4. **Extensibility** - Adding new stock audits wouldn't require touching TypeScript code

## Implementation Considerations

- The `description` for each audit is currently a separate property. With markdown files, the description could be extracted from the opening sentence (as is done for user audits) or from YAML frontmatter
- Need to distinguish between stock audits (bundled with dust, read-only) and user audits (in `.dust/config/audits/`, user-editable)
- Loading from the filesystem at runtime vs bundling at build time

## Open Questions

1. **Description extraction**: Should the description be extracted from the opening sentence of the markdown (matching current user-audit behavior), or should we add YAML frontmatter support for metadata?

2. **Build-time vs runtime loading**: Should audit files be loaded dynamically at runtime (like user audits), or bundled at build time for better performance and to ensure they're included in the npm package?

3. **File extension**: Should stock audit templates use `.md` extension (matching user audits and being explicit about format) or `.txt` extension (matching existing template convention)?

4. **Template variables**: Current templates support `{{variable}}` interpolation. Should audit templates support this too, and if so, what variables would be useful?
