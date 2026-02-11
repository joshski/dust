# Add Idea: Move agent-specific instructions lower

Research this idea thoroughly, then create an idea file at `.dust/ideas/move-agent-specific-instructions-lower.md`. Read the codebase for relevant context, flesh out the description, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. The idea should have the title "Move agent-specific instructions lower" and start from the following description:

Currently running `dust agent` shows:

```
🤖 Hello Claude Code Web, welcome to dust!

## Project Instructions
[agent-specific instructions]

[agent-agnostic instructions]
```

Change that to:

```
🤖 Hello Claude Code Web, welcome to dust!

[agent-agnostic instructions]

---
By the way...

[agent-specific instructions]
```

## Goals

(none)

## Blocked By

(none)

## Definition of Done

- [ ] Idea file exists at .dust/ideas/move-agent-specific-instructions-lower.md
- [ ] Idea file has an H1 title matching "Move agent-specific instructions lower"
- [ ] Idea includes relevant context from codebase exploration
- [ ] Open questions are added for any ambiguous or underspecified aspects
