# Use Title Case Consistently in Goals

Goal titles and links to goals should use consistent title case formatting. Currently there are inconsistencies:

**Goal titles using sentence case (should be title case):**
- `.dust/goals/agent-autonomy.md`: "# Agent autonomy" → "# Agent Autonomy"
- `.dust/goals/stubs-over-mocks.md`: "# Stubs over mocks" → "# Stubs Over Mocks"

**Links with inconsistent casing:**
- `.dust/goals/decoupled-code.md`: "[Stubs over Mocks]" → "[Stubs Over Mocks]"

## Title case rules

Use standard title case rules:
- Capitalize the first and last words
- Capitalize all major words (nouns, verbs, adjectives, adverbs)
- Lowercase minor words (articles, prepositions, conjunctions) unless they are the first or last word

## Files to modify

- `.dust/goals/agent-autonomy.md` - Update title to "# Agent Autonomy"
- `.dust/goals/stubs-over-mocks.md` - Update title to "# Stubs Over Mocks"
- `.dust/goals/decoupled-code.md` - Update link text to "[Stubs Over Mocks]"

## Goals

- [Clarity Over Brevity](../goals/clarity-over-brevity.md)
- [Repository Hygiene](../goals/repository-hygiene.md)

## Blocked by

(none)

## Definition of done

- [ ] All goal titles use consistent title case
- [ ] All links to goals match the title case of the goal they reference
- [ ] `bin/dust lint markdown` passes
