# Add installDependenciesHint configuration setting

The task instructions currently say "Install dependencies if this is a fresh checkout" but agents have no way to know what command to run.

Add a `installDependenciesHint` configuration setting that:
- Is injected into the task instructions template
- Defaults to "Install any dependencies" on `dust init`
- Allows projects to customize with their specific install command

The template line would become: `{{installDependenciesHint}} if this is a fresh checkout`

## Goals

- [Clarity over Brevity](../goals/clarity-over-brevity.md)

## Blocked by

(none)

## Definition of done

- [ ] Add `installDependenciesHint` to the config schema
- [ ] Set default value in `dust init`
- [ ] Update `lib/templates/agent-tasks.txt` to use `{{installDependenciesHint}} if this is a fresh checkout`
- [ ] All tests pass
