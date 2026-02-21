# Refine verb aware idea buttons

When adding a new idea through the UI, the submit button text is dynamically generated based on the verb in the idea title. For example, if the user types "Refactor the auth system", the button might say "Refactor it!". This creates an engaging, contextual interaction.

However, this verb-based button text is misleading when the "Skip the research" checkbox is unchecked. In this case, the action doesn't immediately execute the verb - instead it creates a research task (`CAPTURE_IDEA_PREFIX` in `lib/artifacts/workflow-tasks.ts:9`) that instructs an agent to research the idea thoroughly before creating the idea file. The button text should reflect this indirection.

When research is enabled (checkbox unchecked), the button text should always be "Look into it!" regardless of the title's verb. The verb-based text should only appear when "Skip the research" is checked, since in that case the task created (`BUILD_IDEA_PREFIX`) more directly acts on the idea.

## Context

The `createCaptureIdeaTask` function in `lib/artifacts/workflow-tasks.ts:274` accepts a `buildItNow` boolean option that determines the task type:

- `buildItNow: false` (research enabled) → Creates task with `CAPTURE_IDEA_PREFIX` that says "Research this idea thoroughly, then create an idea file..."
- `buildItNow: true` (skip research) → Creates task with `BUILD_IDEA_PREFIX` that says "Research this idea thoroughly, then create one or more narrowly-scoped task files..."

The verb extraction and button text logic appears to be in the dust bucket UI (external to this codebase), which calls into the artifacts repository API.

Related principle: [Unsurprising UX](../principles/unsurprising-ux.md) - button text should match user expectations of what will happen when clicked.

## Open Questions

### Where should the button text logic live?

#### In the UI layer

The UI already extracts the verb for display purposes. Adding conditional logic based on the "Skip the research" checkbox keeps the display concerns together. The backend API doesn't need to know about button labels.

#### In the API response

The `createCaptureIdeaTask` function (or a related API) could return a suggested button label alongside the task path. This centralizes the logic and ensures consistency across any UI that might call the API.

### Should the verb-based button remain for "Skip the research" mode?

#### Yes, keep verb-based buttons when skipping research

The verb-based button text ("Refactor it!", "Add it!") is cute and contextual. When research is skipped, the action more directly matches the verb, so the button text is less misleading.

#### No, always use consistent button text

Using consistent text like "Add idea" or "Create task" reduces cognitive load and avoids any ambiguity about what will happen. The verb extraction was fun but may not add enough value to justify the complexity.
