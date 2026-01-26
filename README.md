# Dust

A lightweight planning system and work tracker optimised for humans working with AI agents.

[![CI](https://github.com/joshski/dust/actions/workflows/ci.yml/badge.svg)](https://github.com/joshski/dust/actions/workflows/ci.yml)

## Usage

Document your system and any future plans in a [.dust](./.dust) directory in your repository:

```
.dust/
├── goals/    # Mission statements explaining why the project exists
├── ideas/    # Brief notes about future tasks (intentionally vague)
├── tasks/    # Detailed work plans with dependencies and definition of done
├── facts/    # Current state: design, architecture, rules, invariants
└── hooks/    # Executable scripts for CLI integration (e.g., quality gates)
```

The `goals`, `ideas`, `tasks`, and `facts` directories should be flat (no subdirectories) and contain only markdown files with slug-style names (alphanumeric and hyphens only).

The `hooks` directory contains executable scripts that integrate with the `dust` CLI. For example, the `check` hook is run by `dust check` to execute project-defined quality gates.

## CLI Commands

The `dust` CLI provides commands for managing your planning repository:

| Command | Description |
|---------|-------------|
| `dust init` | Initialize a new Dust repository with the standard directory structure |
| `dust prompt <name>` | Output a prompt by name from the `prompts/` directory |
| `dust validate` | Run validation checks on `.dust/` files (links, task structure, naming) |
| `dust list [type]` | List items by type (tasks, ideas, goals, facts) or all if no type specified |
| `dust next` | Show tasks ready to work on (not blocked by other incomplete tasks) |
| `dust check` | Run `validate` then execute the project's quality gate hook at `.dust/hooks/check` |
| `dust help` | Show help message with all available commands |

### Examples

```bash
# Initialize a new project
dust init

# List all tasks
dust list tasks

# List everything (tasks, ideas, goals, facts)
dust list

# Show tasks that are ready to start
dust next

# Validate all .dust files
dust validate

# Run quality checks (validation + custom hook)
dust check

# Output a prompt by name
dust prompt work
```

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

## Continuous Integration

A GitHub Actions workflow runs quality checks on all pull requests to the main branch. The workflow executes `dust check`, which runs the project's quality gate hook (`.dust/hooks/check`).

### Recommended Branch Protection

To ensure all changes pass quality checks before merging, configure branch protection rules for the `main` branch:

1. Go to Settings > Branches > Add rule
2. Set "Branch name pattern" to `main`
3. Enable "Require status checks to pass before merging"
4. Select the "Quality Gate" status check
5. Optionally enable "Require branches to be up to date before merging"

This ensures that no pull request can be merged until the CI checks pass.
