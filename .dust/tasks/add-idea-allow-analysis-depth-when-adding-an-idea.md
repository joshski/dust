# Add Idea: Allow "analysis depth" when adding an idea

Research this idea thoroughly, then create an idea file at `.dust/ideas/allow-analysis-depth-when-adding-an-idea.md`. Read the codebase for relevant context, flesh out the description, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. Review `.dust/goals/` and `.dust/facts/` for relevant context. The idea should have the title "Allow "analysis depth" when adding an idea" and start from the following description:

Rename `createCaptureIdeaTask` to `addIdea`. It should take two arguments:

* a fileSystem
* an object with { title, description, analysisDepth }

analysisDepth should allow the user to control how deeply the agent researches before creating the idea file.

## Goals

(none)

## Blocked By

(none)

## Definition of Done

- [ ] Idea file exists at .dust/ideas/allow-analysis-depth-when-adding-an-idea.md
- [ ] Idea file has an H1 title matching "Allow "analysis depth" when adding an idea"
- [ ] Idea includes relevant context from codebase exploration
- [ ] Open questions are added for any ambiguous or underspecified aspects
