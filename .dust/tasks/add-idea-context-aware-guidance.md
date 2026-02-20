# Add Idea: Context aware guidance

Research this idea thoroughly, then create an idea file at `.dust/ideas/context-aware-guidance.md`. Read the codebase for relevant context, flesh out the description, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. If you add open questions, use `## Open Questions` with `### Question?` headings and one or more `#### Option` headings beneath each question, and only add questions that are meaningful decisions worth asking. Review `.dust/principles/` and `.dust/facts/` for relevant context.

## Idea Description

When a repository has very few features, there is nothing for agents to learn from. Therefore they need more help to "do the right thing".

For example, an agent prompted with "Make a roguelike game" might be tempted to build the game in one shot. But we want to establish preferences from the human, rather than blindly making _any old roguelike game_. For instance, we don't want to assume a tech stack if that hasn't been established.

Even in an established project, an ambitious new feature should be treated differently than a small feature with relatively low risk.

Instead of launching into implementation of ambitious features, an agent should be instructed to make a single idea file that asks leading questions, with a view to 1) immediately getting on with something, and 2) asking probing questions to establish the remaining scope.

## Principles

(none)

## Blocked By

(none)

## Definition of Done

- [ ] Idea file exists at .dust/ideas/context-aware-guidance.md
- [ ] Idea file has an H1 title matching "Context aware guidance"
- [ ] Idea includes relevant context from codebase exploration
- [ ] Open questions are added for any ambiguous or underspecified aspects
- [ ] Open questions follow the required heading format and focus on high-value decisions
