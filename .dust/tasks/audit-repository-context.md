# Audit: Repository Context

Compile or update `.dust/repository.md` with a high-level overview of the repository's purpose, capabilities, and design philosophy.

## Purpose

The repository context document helps downstream agents quickly understand the project without reading individual files. It describes features, scenarios, and design philosophy rather than implementation details. This enables high-level planning where agents reason about capabilities rather than code structure.

## Scope

Review the current state of the codebase and produce a document covering:

1. **What the project is** - A one-sentence summary of its purpose
2. **What it does** - The key capabilities and features it provides
3. **How it fits into workflows** - How users or other systems interact with it
4. **Design philosophy** - The guiding principles behind its architecture
5. **Key scenarios** - The main use cases or user journeys it supports

Avoid mentioning specific file paths, class names, or implementation details. Write for someone who needs to make high-level suggestions about the project's direction, not someone about to edit a specific file.

## Analysis Steps

1. Read the existing `.dust/repository.md` if it exists
2. Review README, package.json, and top-level documentation for project purpose
3. Scan the codebase to understand features and capabilities
4. Review `.dust/principles/` for design philosophy
5. Review `.dust/facts/` for context on current state
6. Update `.dust/repository.md` with current findings, preserving any sections that are still accurate

## Principles

(none)

## Blocked By

(none)

## Definition of Done

- [ ] `.dust/repository.md` exists and is up to date
- [ ] Document describes what the project does without referencing specific files
- [ ] Key capabilities and features are listed
- [ ] Design philosophy or guiding approach is captured
- [ ] Document is concise enough to fit comfortably in an agent context window
- [ ] A new agent reading only this document could make sensible high-level suggestions