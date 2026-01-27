# Simplify agent template helper functions

The `agent.ts` file defines six nearly identical one-liner functions that each just call `loadTemplate` with a different template name. This repetition adds noise without value.

Replace these with direct `loadTemplate` calls or a single helper function.

## Goals

- [Clarity Over Brevity](../goals/clarity-over-brevity.md)

## Blocked by

(none)

## Definition of done

- [ ] Remove the six individual `generate*` helper functions from `agent.ts`
- [ ] Replace with direct `loadTemplate()` calls in the switch statement
- [ ] Create a single `templateVariables(settings)` helper if needed for the common `{ bin: settings.dustCommand }` pattern
- [ ] All tests pass
