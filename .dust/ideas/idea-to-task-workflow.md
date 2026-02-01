# Idea-to-Task Workflow

Provide structured guidance for converting vague ideas into actionable tasks.

## Problem

Ideas are intentionally vague, but the process for promoting them to tasks isn't well-defined. This can lead to ideas languishing or tasks being created prematurely without proper scoping.

## Concept

A `dust promote idea` command or workflow that guides the user through:

1. **Scope refinement** - What's the smallest valuable increment?
2. **Goal linkage** - Which goals does this support?
3. **Dependency identification** - What must exist first?
4. **Definition of done** - What are the concrete acceptance criteria?
5. **Validation** - Is this actually ready, or does it need more thinking?

## Example Interaction

```
$ dust promote idea goal-driven-task-generation

This idea is about: Analyze the codebase against a stated goal and propose tasks.

Questions to answer:
1. What's the minimum viable implementation?
   > A command that reads one goal and lists potential improvements

2. Which goals does this support?
   > Lightweight Planning, Agent Autonomy

3. What's blocking this?
   > Need to understand how agents would explore the codebase

Ready to create task? (y/n)
```

## Alignment with Goals

- **Lightweight Planning** - Structured but not heavy process
- **Small Units** - Encourages scoping down during promotion
- **Human-AI Collaboration** - Human decision to promote, agent can assist

## Alternative: Agent-Assisted Promotion

An agent could review an idea and draft a task file, which a human then approves or refines.
