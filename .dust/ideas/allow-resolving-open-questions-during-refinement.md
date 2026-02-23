# Allow resolving open questions during refinement

Accept optional open question responses when creating a refine-idea task, mirroring the existing behavior for decompose-idea tasks.

## Background

The current workflow supports resolving open questions when decomposing an idea. The `createDecomposeIdeaTask` function accepts an optional `openQuestionResponses` parameter (see `lib/artifacts/workflow-tasks.ts:219-223`), which renders a `## Resolved Questions` section in the generated task file.

However, `createRefineIdeaTask` (line 333-354) only accepts `ideaSlug` and `description`, with no mechanism to resolve open questions. This creates an asymmetry: questions can be answered when moving from refinement to decomposition, but not during the refinement step itself.

## Use Case

When triggering a refine-idea task, a user may already know the answer to one or more open questions in the idea file. For example:

1. An idea has open questions about "Which protocol?" with options WebSockets, SSE, or polling
2. The user decides on WebSockets before refinement begins
3. Currently: The user must either manually edit the idea file or wait for the agent to ask
4. With this change: The user passes `openQuestionResponses` when creating the refine task

This is especially valuable when:
- The user has already discussed the decision elsewhere
- The question has an obvious answer in the user's context
- The user wants to constrain the agent's exploration

## Implementation Considerations

The infrastructure already exists for this feature:

- `OpenQuestionResponse` type is defined in `lib/artifacts/workflow-tasks.ts:214-217`
- `renderResolvedQuestions` helper renders the section (lines 245-249)
- `createIdeaTransitionTask` already accepts optional `resolvedQuestions` (lines 298-331)
- `createDecomposeIdeaTask` demonstrates the pattern (lines 357-379)

Adding this to `createRefineIdeaTask` would require:

1. Updating the function signature to accept `openQuestionResponses`
2. Passing it through to `createIdeaTransitionTask` via `taskOptions`
3. Updating the repository interface in `lib/artifacts/index.ts`
4. Updating the fact file `.dust/facts/workflow-tasks.md` to document the new parameter

## Open Questions

### Should resolved questions be removed from the idea file during refinement?

#### Leave the idea file unchanged

The resolved questions in the task file are instructions to the agent about decisions already made. The idea file remains the source of truth with all original questions. The agent can update the idea file during refinement to reflect decisions.

Pros: Maintains separation between task instructions and idea state, allows agent to refine the questions themselves
Cons: Potential confusion if idea file still shows questions that have been answered

#### Automatically remove resolved questions from the idea file

When creating a refine-idea task with resolved questions, also update the idea file to remove those questions (or mark them as resolved).

Pros: Keeps idea file in sync with decisions, reduces agent confusion
Cons: Requires write access during task creation, adds complexity, changes scope of task creation

### What happens if a resolved question doesn't match an existing question in the idea file?

#### Strict validation: reject mismatches

Only accept question responses that exactly match questions in the idea file. Throw an error if a response references a non-existent question.

Pros: Catches typos and mistakes early, ensures consistency
Cons: Fragile to minor wording differences, requires idea parsing during task creation

#### Permissive: include any resolved questions

Accept any question responses, even if they don't match existing questions. The agent can interpret them as additional context or constraints.

Pros: Flexible, allows users to provide arbitrary guidance, simpler implementation
Cons: May lead to confusion if question wording doesn't match
