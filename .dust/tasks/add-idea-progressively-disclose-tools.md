# Add Idea: Progressively disclose tools

Research this idea thoroughly, then create one or more idea files in `.dust/ideas/`. Read the codebase for relevant context, flesh out the description, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. If you add open questions, use `## Open Questions` with `### Question?` headings and one or more `#### Option` headings beneath each question, and only add questions that are meaningful decisions worth asking. Run `dust principles` and `dust facts` for relevant context.

## Idea Description

Server-defined tools should be arbitrarily complex without consuming the context window (like MCP) with all the details of tools that may never be used. Expand the server-defined protocol to support progressive disclose of tools and their “sub tools”. For example, agents that need access to historic sessions should know that a “family” of session tools exist, allowing them to search/filter/view details of sessions, but the fine details (search parameters, pagination, etc) should be progressively revealed as and when the agent starts to use the “sessions” tool. A bit like exploring a REST API by following links…

## Blocked By

(none)


## Definition of Done

- [ ] One or more idea files are created in `.dust/ideas/`
- [ ] Each idea file has an H1 title matching its content
- [ ] Idea includes relevant context from codebase exploration
- [ ] Open questions are added for any ambiguous or underspecified aspects
- [ ] Open questions follow the required heading format and focus on high-value decisions
