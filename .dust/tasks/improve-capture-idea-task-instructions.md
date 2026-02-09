# Improve Capture Idea Task Instructions

Update `createCaptureIdeaTask` in `lib/workflow-tasks.ts` to instruct agents to thoroughly research ideas and surface open questions at capture time.

Currently the task just tells the agent to create a file with a title and description. The definition of done only checks that the file exists and has the right title — there's no instruction to research the codebase, flesh out the idea, or identify ambiguity.

Change the opening sentence from the current mechanical "create a file" instruction to something like:

> Research this idea thoroughly, then create an idea file at `<path>`. Read the codebase for relevant context, flesh out the description, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file.

The user's original description should be included as a starting point, but the agent should expand on it.

Change the definition of done from:

- [ ] Idea file exists at the path
- [ ] Idea file has an H1 title matching the title

To:

- [ ] Idea file exists at the path
- [ ] Idea file has an H1 title matching the title
- [ ] Idea includes relevant context from codebase exploration
- [ ] Open questions are added for any ambiguous or underspecified aspects

Update the corresponding tests in `lib/workflow-tasks.test.ts` to match the new wording.

## Goals

(none)

## Blocked By

(none)

## Definition of Done

- [ ] `createCaptureIdeaTask` opening sentence instructs the agent to research thoroughly and surface open questions
- [ ] Definition of done items in generated task include research and open questions
- [ ] Tests in `lib/workflow-tasks.test.ts` updated and passing
