# Workflow Task Hints

Workflow task templates can be extended with optional hint files in [`.dust/config/hints/`](../config/hints).

Supported files:
- `refine-idea.md`
- `decompose-idea.md`
- `shelve-idea.md`
- `add-idea.md`
- `expedite-idea.md`

If a hint file exists, its contents are rendered in a dedicated `## Repository Hints` section. This section appears after the idea-specific section and before `## Definition of Done`. If no hint file exists, the section is omitted.

## Example

If `.dust/config/hints/expedite-idea.md` contains:

```md
Prefer implementation when change scope is isolated to one module.
```

Then generated expedite tasks include:

```md
## Repository Hints

Prefer implementation when change scope is isolated to one module.
```
