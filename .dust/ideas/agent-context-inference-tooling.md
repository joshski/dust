# Agent context inference tooling

Help agents infer the correct files and context from brief human instructions.

## Background

The [Agent Context Inference](../principles/agent-context-inference.md) principle states: "When a human gives a brief instruction like 'the button should be green', the agent should be able to infer what to do. The agent shouldn't require the human to specify file paths, component names, or implementation details that can be discovered from the repository."

Currently, dust provides task files and facts that give agents explicit context. However, there's no tooling specifically designed to help agents discover context from vague instructions.

## The Gap

When an agent receives a terse instruction like "fix the login bug" or "make the header sticky", it must:

1. Search for relevant files (login-related code, header components)
2. Identify which of many matches is the correct target
3. Understand the existing implementation before making changes

Agents already have access to grep, glob, and read tools. But there's no dust-specific support for translating vague human intent into concrete file targets.

## Potential Approaches

### Semantic file index

Build an index of files with their purposes (extracted from comments, function names, file names). An agent could query "files related to authentication" and get ranked results.

### Recent change context

When a human mentions something briefly, it's often related to recent work. A command like `dust context "login"` could show:
- Files matching "login" in name or content
- Recent commits touching those files
- Related facts and tasks

### Intent-to-file mapping

Allow repositories to define mappings from common intents to file locations:
```yaml
# .dust/config/context-hints.yaml
authentication:
  - lib/auth/**
  - pages/login.tsx
header:
  - components/Header/**
```

## Principle Alignment

- [Agent Context Inference](../principles/agent-context-inference.md) - Directly supports this principle
- [Agent Autonomy](../principles/agent-autonomy.md) - Reduces friction for autonomous operation
- [Exploratory Tooling](../principles/exploratory-tooling.md) - Helps agents explore unfamiliar areas

## Open Questions

### Is explicit tooling necessary?

#### Yes, build dedicated tooling

Agents benefit from structured output optimized for their consumption. A purpose-built tool could outperform general-purpose search.

#### No, rely on existing tools

Modern agents with grep, glob, and read are already good at finding relevant files. Adding more tools may be unnecessary complexity. Focus instead on documentation and facts that help agents understand what they find.

### What form should the tooling take?

#### New dust command

`dust context <query>` returns relevant files and context for a natural-language query.

#### Enhanced facts file

A `.dust/facts/file-purposes.md` file that maps directories to their purposes, which agents can read.

#### Configuration-based hints

A `.dust/config/context-hints.yaml` that agents can consult when searching.
