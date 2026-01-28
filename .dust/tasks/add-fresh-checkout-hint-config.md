# Add freshCheckoutHint configuration setting

The task instructions currently say "Install dependencies if this is a fresh checkout" but agents have no way to know what command to run.

Add a `freshCheckoutHint` configuration setting that:
- Is injected into the task instructions template
- Defaults to "Check .dust/facts/ for setup instructions" on `dust init`
- Allows projects to customize with their specific install command

The template line would become: `{{freshCheckoutHint}} if this is a fresh checkout`

## Goals

- [Clarity over Brevity](../goals/clarity-over-brevity.md)

## Blocked by

(none)

## Definition of done

- [ ] Add `freshCheckoutHint` to the config schema
- [ ] Set default value in `dust init`
- [ ] Update `lib/templates/agent-tasks.txt` to use `{{freshCheckoutHint}} if this is a fresh checkout`
- [ ] All tests pass
