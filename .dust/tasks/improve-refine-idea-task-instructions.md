# Improve Refine Idea Task Instructions

Update `createRefineIdeaTask` in `lib/workflow-tasks.ts` to instruct agents to thoroughly research ideas and surface open questions.

Currently the opening sentence is generic ("Research and refine this idea into a well-defined proposal") and the definition of done says "Open questions are identified and resolved" — which is misleading because a refine task should *surface* open questions, not resolve them.

Change the opening sentence to something like:

> Thoroughly research this idea and refine it into a well-defined proposal. Read the idea file, explore the codebase for relevant context, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file.

Change the definition of done to:

- [ ] Idea is thoroughly researched with relevant codebase context
- [ ] Open questions are added for any ambiguous or underspecified aspects
- [ ] Idea file is updated with findings

Update the corresponding tests in `lib/workflow-tasks.test.ts` to match the new wording.

## Goals

- [Agent Autonomy](../goals/agent-autonomy.md)

## Blocked By

(none)

## Definition of Done

- [ ] `createRefineIdeaTask` opening sentence explicitly says to research thoroughly and surface open questions
- [ ] Definition of done items in generated task shifted from "resolve" to "surface"
- [ ] Tests in `lib/workflow-tasks.test.ts` updated and passing
