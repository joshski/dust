# Implement dust audit add command

Implement the `dust audit <name>` command that creates a task from an audit template. The command should:

1. Look for `.dust/config/audits/<name>.md` first (user-configured)
2. Fall back to stock audit with that name
3. Copy the template content to `.dust/tasks/audit-<name>.md`
4. Output the path to the created task

The task file created should be identical to the template, except:
- Filename becomes `audit-<template-name>.md`
- Title becomes `Audit: <original title>`

If the audit task already exists (`.dust/tasks/audit-<name>.md`), the command should error and refuse to create a duplicate.

## Goals

- [Easy Adoption](../goals/easy-adoption.md)
- [Make Changes with Confidence](../goals/make-changes-with-confidence.md)

## Blocked By

(none)

## Definition of Done

- [ ] `dust audit <name>` creates task at `.dust/tasks/audit-<name>.md`
- [ ] Command checks user audits first, then falls back to stock audits
- [ ] Task file title is transformed to `Audit: <original title>`
- [ ] Command errors if audit task already exists
- [ ] Command errors if audit name is not found in either source
- [ ] Command outputs the path to the created task
- [ ] Unit tests cover success, not found, and already exists cases
