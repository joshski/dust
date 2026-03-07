# Workflow Task Hints

Workflow task templates can be extended with optional hint files in `.dust/config/hints/`.

Supported files:
- `refine-idea.md`
- `decompose-idea.md`
- `shelve-idea.md`
- `add-idea.md`
- `expedite-idea.md`

If a hint file exists, its contents are appended to the task opening sentence with a blank line separator. If it does not exist, task generation proceeds normally.

## Example

If `.dust/config/hints/expedite-idea.md` contains:

```md
Prefer implementation when change scope is isolated to one module.
```

Then generated expedite tasks include that line immediately after the default opening instructions.
