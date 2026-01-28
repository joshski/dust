# Update agent guidance text

Change the text in `lib/templates/help.txt:23` from:

```
For AI agent guidance, run `{{bin}} agent`.
```

to:

```
If you are an AI agent, run `{{bin}} agent` now!
```

## Goals

- [Human-AI Collaboration](../goals/human-ai-collaboration.md)

## Blocked by

(none)

## Definition of done

- [ ] Text in `lib/templates/help.txt` updated to "If you are an AI agent, run `{{bin}} agent` now!"
- [ ] `bin/dust check` passes
