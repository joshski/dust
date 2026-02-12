# Add Idea: dust audit

Research this idea thoroughly, then create an idea file at `.dust/ideas/dust-audit.md`. Read the codebase for relevant context, flesh out the description, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. Review `.dust/goals/` and `.dust/facts/` for relevant context. The idea should have the title "dust audit" and start from the following description:

Running `dust audit` should show a list tasks that generate canned “audit tasks”. These include “stock tasks” that the user can pick and use verbatim, or they can use one of the tasks stored under .dust/config/audits/*.md — both of these should be listed in a similar style to `dust tasks`

Running `dust audit <name>` should add a copy of either the configured, or falling back, the stock audit task with that name.

## Goals

(none)

## Blocked By

(none)

## Definition of Done

- [ ] Idea file exists at .dust/ideas/dust-audit.md
- [ ] Idea file has an H1 title matching "dust audit"
- [ ] Idea includes relevant context from codebase exploration
- [ ] Open questions are added for any ambiguous or underspecified aspects
