# Rename Principle to Enable Flow State

Rename the top-level principle from "Make Software Development Joyful" to "Enable Flow State". Update its content to frame dust's design around Csikszentmihalyi's flow theory.

## Background

The current "Make Software Development Joyful" principle already mentions flow states but frames them as one of several sources of joy. Flow is the more precise and actionable concept - it has specific conditions (clear goals, immediate feedback, challenge-skill balance) that map directly to dust's design principles.

## Implementation Details

### Rename the principle file

Rename `.dust/principles/make-software-development-joyful.md` to `.dust/principles/enable-flow-state.md`.

### Update the principle content

Rewrite the principle to:
- Title: "Enable Flow State"
- Explain flow as dust's foundational concept
- Include brief attribution to Mihaly Csikszentmihalyi
- Connect dust's design to the three conditions of flow:
  - Clear goals (task files, lightweight planning)
  - Immediate feedback (fast feedback loops)
  - Challenge-skill balance (small units, agent autonomy)
- Keep "Human-AI Collaboration" and "Maintainable Codebase" as direct children
- Frame how these sub-principles contribute to flow

### Update child principles

Update the Parent Principle links in:
- `.dust/principles/human-ai-collaboration.md`
- `.dust/principles/maintainable-codebase.md`

Change the parent principle link from "Make Software Development Joyful" to "Enable Flow State".

### Search for other references

Search the codebase for any other references to "make-software-development-joyful" or "Make Software Development Joyful" and update them.

## Principles

- [Naming Matters](../principles/naming-matters.md)

## Blocked By

(none)

## Definition of Done

- [ ] Principle file renamed to `enable-flow-state.md`
- [ ] Principle content rewritten around flow state concept with Csikszentmihalyi attribution
- [ ] Child principles updated with new parent link
- [ ] All other references to the old principle name updated
- [ ] `bin/dust check` passes
