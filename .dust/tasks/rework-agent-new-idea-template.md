# Rework agent-new-idea template

The `lib/templates/agent-new-idea.txt` template currently provides general information about working with ideas rather than step-by-step instructions for creating one. It should be restructured to match the goal-oriented format of `lib/templates/agent-new-task.txt`.

## Changes needed

1. Replace the current informational content with numbered steps for adding a new idea
2. Add a validation step: `Run `{{bin}} validate` to catch any issues with the idea file format`
3. Include a prescriptive commit message format: `Add idea: <title>`
4. Keep the guidance concise and actionable

## Goals

- [Clarity Over Brevity](../goals/clarity-over-brevity.md)
- [Easy Adoption](../goals/easy-adoption.md)
- [Lightweight Planning](../goals/lightweight-planning.md)

## Blocked by

(none)

## Definition of done

- [ ] Template provides numbered step-by-step instructions
- [ ] Validation step is included before the commit step
- [ ] Commit message format "Add idea: <title>" is specified
- [ ] Template follows the same structural pattern as `agent-new-task.txt`
