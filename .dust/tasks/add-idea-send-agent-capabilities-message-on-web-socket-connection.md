# Add Idea: Send 'agent capabilities' message on web socket connection

Research this idea thoroughly, then create one or more idea files in `.dust/ideas/`. Read the codebase for relevant context, flesh out the description, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. If you add open questions, use `## Open Questions` with `### Question?` headings and one or more `#### Option` headings beneath each question, and only add questions that are meaningful decisions worth asking. Run `dust principles` and `dust facts` for relevant context.

## Idea Description

When running `dust bucket worker` - send a message declaring the capabilities of the machine, such as:

* which coding agents the machine supports (i.e. has keys for)
* which models are supported by those coding agents (since this can vary between accounts)

e.g. with codex an API request may be necessary:

curl -s https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
| jq -r '.data[].id' \
| grep -i codex

...and with claude, we may want to use aliases like `haiku` etc - or some other way of discovering the exact models:

https://github.com/anthropics/claude-code/issues/12612

## Blocked By

(none)

## Definition of Done

- [ ] One or more idea files are created in `.dust/ideas/`
- [ ] Each idea file has an H1 title matching its content
- [ ] Idea includes relevant context from codebase exploration
- [ ] Open questions are added for any ambiguous or underspecified aspects
- [ ] Open questions follow the required heading format and focus on high-value decisions
