# Dust

A lightweight planning system and work tracker optimised for humans working with AI agents.

## Structure

The current state and any future plans are documented in markdown files in your repository. Four distinct sets of markdown files represent everything needed to manage complex projects of any kind:

`./.dust/goals` - high level “mission statements” that explain why the project exists and what it aims to achieve.

`./.dust/ideas` - brief and vague notes about future tasks, intentionally lacking detail - these files may exist far in advance of implementation - and could therefore easily go stale.

`./.dust/tasks` - detailed and structured plans that describe a single unit of work, including dependencies and a “definition of done”.

`./.dust/facts` - documents that describe the current state of the system such as how it works, its design and architecture, the way it is structured, any rules or invariants.

Each directory should be flat, i.e. have no subdirectories - it should only contain markdown files. Their filenames should correspond to intent (usually a file-system friendly representation of the document title) rather than numbers or codes. Markdown files should have “slug” style naming (alphanumeric and hyphens only).

## Workflow

Dust is designed for successive cycles of human planning (AI-assisted, of course) followed by agent autonomy, followed by human planning, etc.

In order for work to begin, there must be a task. A worker (an AI agent or human) chooses any task to work on. In a team environment, the worker must “claim” the task i.e. let the team know they are working on it. The team can use a version control system (like git) claim the task by making a branch with the same name as the task. If any attempt to claim fails (e.g. a branch with that name already exists) then the agent must choose an alternative task.

When the worker completes their task, they make a single commit that includes the work, but also deletes the task, and removes any references to the task. The commit should often update one or more facts as well.

Tasks are supposed to be small units of work that can be completed quickly and within a single commit, that leaves the system in a reasonable state (e.g. no broken or half-implemented features exposed to end users). If there is any doubt, workers are encouraged to split the task into smaller sub-tasks, and abandon the attempt to finish the ambitious work in one go.

Over time, new ideas emerge, and ideas become more detailed plans. This should be deferred until the last responsible moment. Since humans like control over plans, ideas become plans in the "human-in-the-loop" phase at the start of a sprint.

## Tasks

Tasks are the only markdown files that have a strict structure. Tasks must have each of the following subheadings:

```
## Goals
## Blocked by
## Definition of done
```

* Goals - a list of relative links to other markdown files, always under ./.dust/goals
* Blocked by - a list relative links to other markdown files, each of which nominates a task that must be implemented before this task can be started.
* Definition of done - A short description of how the implementor of the task can decide when the task has been completed successfully

These special headings and sections are required, but the remainder of the document is free form.

## The single commit

Each task should be a small unit of work. If it was underestimated, the agent implementing the task should commit any progress that does not have a negative impact on end users, and create another "follow up" task to complete the remainder of the work.

## Links between documents

Documents should include links to all relevant related documents, regardless of the type. These should be relative links in markdown format. The link text should typically match the title of the target document.

## Change history

Commits delete tasks, but commit history can be traversed to retrieve the thinking behind any changes. Tools can be implemented to make this easier or build indexes. The current working copy is kept intentionally free of this detail, to keep commits clean and reduce noise in the current repository state.

## Hygiene

A linter can be used for static analysis of task files, and to ensure there are no broken relative links as the result of any changes.

Regular semantic and logic checks are expected to be carried out to ensure ideas have not drifted from reality. This would typically happen after one or more commits, e.g. at the end of a sprint.