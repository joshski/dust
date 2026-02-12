# Decompose Idea: dust audit

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks -- split the idea into multiple tasks if it covers more than one logical change. Review `.dust/goals/` to link relevant goals and `.dust/facts/` for design decisions that should inform the task. See [dust audit](../ideas/dust-audit.md).

audit task "templates" are never automatically deleted. The same task can be copied into the ".dust/tasks" directory as required.

After the template is copied into .dust/tasks the task is like any other task (i.e. the copy gets deleted after implementation)

The file added to .dust/tasks should be identical to the template, except with the title "audit-<template-name>" and the title "Audit: <original title>". Audit templates should be validated like tasks.

## Resolved Questions

### Should audits support parameters?

**Decision:** No parameters

### How should "stock" audits be discovered?

**Decision:** Hardcoded list

### Should running an audit also offer to pick that task immediately?

**Decision:** Just create the task

### What happens if the audit task already exists?

**Decision:** Error and refuse

### Should audits be able to create sub-tasks?

**Decision:** Self-contained


## Goals

(none)

## Blocked By

(none)

## Definition of Done

- [ ] One or more new tasks are created in .dust/tasks/
- [ ] Task's Goals section links to relevant goals from .dust/goals/
- [ ] The original idea is deleted or updated to reflect remaining scope
