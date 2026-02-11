# Add Idea: Fix focus parsing

Research this idea thoroughly, then create an idea file at `.dust/ideas/fix-focus-parsing.md`. Read the codebase for relevant context, flesh out the description, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. Review `.dust/goals/` and `.dust/facts/` for relevant context. The idea should have the title "Fix focus parsing" and start from the following description:

When the focus line is `bin/dust focus "Add Idea: Use a consistent font across platforms" 2>&1` then we don't detect this as a focus command. We should look for:

`dust focus ` followed by `".+"` or `'.+'` -- and if it's double quotes, then unescape them

## Goals

(none)

## Blocked By

(none)

## Definition of Done

- [ ] Idea file exists at .dust/ideas/fix-focus-parsing.md
- [ ] Idea file has an H1 title matching "Fix focus parsing"
- [ ] Idea includes relevant context from codebase exploration
- [ ] Open questions are added for any ambiguous or underspecified aspects
