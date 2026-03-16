# Add Idea: Add “Some Big Design Up Front” Principle

Research this idea thoroughly, then create one or more idea files in `.dust/ideas/`. Read the codebase for relevant context, flesh out the description, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. If you add open questions, use `## Open Questions` with `### Question?` headings and one or more `#### Option` headings beneath each question, and only add questions that are meaningful decisions worth asking. Run `dust principles` and `dust facts` for relevant context.

## Idea Description

Agile’s rejection of “big design up front” was largely an economic decision: detailed architecture was expensive to produce, slow to validate, and often wrong because humans could only explore a small portion of the design space before writing code. Iterative development was cheaper than prediction. AI agents change that equation by dramatically lowering the cost of exploration. An agent can read an entire codebase, generate multiple architectural variants, prototype them, run tests, and measure trade-offs in hours rather than weeks. When the cost of evaluating alternatives drops this much, investing more effort in early design becomes rational because the expected value of avoiding large structural mistakes increases.

However, AI does not eliminate the core reason Agile avoided heavy upfront design: uncertainty about future requirements. Product direction, user behavior, and organizational constraints still change in ways no design process can fully anticipate. The likely outcome is not a return to traditional BDUF but a hybrid model: extensive AI-assisted exploration of architectures early on, followed by iterative evolution as real requirements emerge. In that model, architecture becomes less about committing to a single design early and more about rapidly searching the design space before implementation begins.

## Blocked By

(none)


## Definition of Done

- [ ] One or more idea files are created in `.dust/ideas/`
- [ ] Each idea file has an H1 title matching its content
- [ ] Idea includes relevant context from codebase exploration
- [ ] Open questions are added for any ambiguous or underspecified aspects
- [ ] Open questions follow the required heading format and focus on high-value decisions
